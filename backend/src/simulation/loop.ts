
// Time-based simulation loop: tick, move elevators, open/close doors, update positions, serve stops.

import type { Elevator } from '../models/Elevator';
import type { Stop } from '../models/Stop';
import {
  getElevators,
  getSimTimeMs,
  setSimTimeMs,
  getSpeedMultiplier,
  getIsRunning,
  getRequestById,
  assignRequestToElevator,
  unassignRequest,
  getNumFloors,
  drainCompleted,
} from './state';
import { reorderStops } from '../scheduler/scheduling';
import { retryPendingRequests } from '../scheduler';
import { maybeEmitRequest } from './requestGenerator';
import { isRushWindow, isPreRushWindow, defaults } from '../config/defaults';

// Simulation ms per floor travel (elevator moves 1 floor per FLOOR_MS).
const FLOOR_MS = 1000;

let travelAccumulator = 0;
let lastDrainSimTimeMs = 0;

const doorOpenUntil = new Map<string, number>();
const DOOR_OPEN_DURATION_MS = 1000;

export function resetLoopAccumulator(): void {
  travelAccumulator = 0;
  lastDrainSimTimeMs = 0;
  doorOpenUntil.clear();
}

// Advance simulation by deltaMs (wall-clock). Only runs when isRunning.
// Updates sim time, reorders stops (30s override), moves elevators, serves stops.

export function tick(deltaMs: number): void {
  if (!getIsRunning()) return;

  const speed = getSpeedMultiplier();
  const now = getSimTimeMs();
  const travelBudget = deltaMs * speed;
  setSimTimeMs(now + travelBudget);

  maybeEmitRequest(getSimTimeMs());

  const elevators = getElevators();
  const getRequestTimestamp = (id: string) => getRequestById(id)?.timestamp;

  for (const elevator of elevators) {
    reorderStops(elevator, {
      now,
      getRequestTimestamp,
    });
  }

  travelAccumulator += travelBudget;
  const steps = Math.floor(travelAccumulator / FLOOR_MS);
  travelAccumulator -= steps * FLOOR_MS;

  const simNow = getSimTimeMs();
  const rush = isRushWindow(simNow) || isPreRushWindow(simNow);
  const nFloors = getNumFloors();
  const nElevators = elevators.length;

  for (let step = 0; step < steps; step++) {
    const stepTime = now + (step + 1) * FLOOR_MS;
    for (let i = 0; i < elevators.length; i++) {
      const target = rush
        ? defaults.lobbyFloor
        : getHomeFloor(i, nElevators, nFloors);
      processElevatorTick(elevators[i], stepTime, target);
    }
  }

  const currentSimTime = getSimTimeMs();
  for (const elevator of elevators) {
    const closeAt = doorOpenUntil.get(elevator.id);
    if (elevator.doorOpen && closeAt != null && currentSimTime >= closeAt) {
      elevator.doorOpen = false;
      doorOpenUntil.delete(elevator.id);
    }
  }

  retryPendingRequests(currentSimTime);
  maybeDrain(currentSimTime);
}

function maybeDrain(now: number): void {
  if (now - lastDrainSimTimeMs < defaults.drainIntervalMs) return;
  lastDrainSimTimeMs = now;
  drainCompleted(now, defaults.drainAgeMs);
}


export function getHomeFloor(
  elevatorIndex: number,
  numElevators: number,
  numFloors: number
): number {
  if (numElevators <= 1) return Math.floor((numFloors - 1) / 2);
  return Math.round(elevatorIndex * (numFloors - 1) / (numElevators - 1));
}

function prePositionIdle(elevator: Elevator, targetFloor: number): void {
  if (elevator.currentFloor === targetFloor) {
    elevator.direction = 'idle';
    return;
  }
  elevator.direction = elevator.currentFloor > targetFloor ? 'down' : 'up';
  elevator.currentFloor += elevator.currentFloor > targetFloor ? -1 : 1;
}

function moveToward(elevator: Elevator, target: number, now: number, stop: Stop): void {
  const current = elevator.currentFloor;
  if (current < target) {
    elevator.direction = 'up';
    elevator.currentFloor = current + 1;
  } else if (current > target) {
    elevator.direction = 'down';
    elevator.currentFloor = current - 1;
  }
  if (elevator.currentFloor === target) {
    serveStop(elevator, stop, now);
  }
}

function processElevatorTick(
  elevator: Elevator,
  now: number,
  idleTargetFloor: number
): void {
  if (elevator.doorOpen) return;

  const next = elevator.stops[0];
  if (next) {
    moveToward(elevator, next.floor, now, next);
    return;
  }
  if (elevator.passengers > 0) {
    elevator.direction = 'idle';
    return;
  }
  prePositionIdle(elevator, idleTargetFloor);
}

function serveStop(elevator: Elevator, stop: Stop, now: number): void {
  elevator.doorOpen = true;
  doorOpenUntil.set(elevator.id, now + DOOR_OPEN_DURATION_MS);

  const cap = defaults.elevatorCapacity;
  const overflowIds: string[] = [];

  for (const requestId of stop.requestIds) {
    if (stop.type === 'pickup') {
      if (elevator.passengers >= cap) {
        overflowIds.push(requestId);
        continue;
      }
      elevator.passengers += 1;
      assignRequestToElevator(requestId, elevator.id, now);
    } else {
      elevator.passengers = Math.max(0, elevator.passengers - 1);
      assignRequestToElevator(requestId, elevator.id, undefined, now);
    }
  }

  elevator.stops.shift();

  if (overflowIds.length > 0) {
    const overflow = new Set(overflowIds);
    elevator.stops = elevator.stops.filter((s) => {
      s.requestIds = s.requestIds.filter((id) => !overflow.has(id));
      return s.requestIds.length > 0;
    });
    for (const id of overflowIds) {
      unassignRequest(id);
    }
  }
}