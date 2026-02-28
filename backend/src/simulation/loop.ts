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
} from './state';
import { reorderStops } from '../scheduler/scheduling';
import { maybeEmitRequest } from './requestGenerator';

// Simulation ms per floor travel (elevator moves 1 floor per FLOOR_MS).
const FLOOR_MS = 1000;

// Accumulates fractional travel between ticks so elevators move at all speeds.
let travelAccumulator = 0;

// Track when each elevator's door was opened so it stays open long enough to be visible.
const doorOpenUntil = new Map<string, number>();
const DOOR_OPEN_DURATION_MS = 2000;

export function resetLoopAccumulator(): void {
  travelAccumulator = 0;
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

  for (let step = 0; step < steps; step++) {
    const stepTime = now + (step + 1) * FLOOR_MS;
    for (const elevator of elevators) {
      processElevatorTick(elevator, stepTime);
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
}

const LOBBY_FLOOR = 0;

function prePositionIdle(elevator: Elevator): void {
  if (elevator.currentFloor === LOBBY_FLOOR) {
    elevator.direction = 'idle';
    return;
  }
  elevator.direction = elevator.currentFloor > LOBBY_FLOOR ? 'down' : 'up';
  elevator.currentFloor += elevator.currentFloor > LOBBY_FLOOR ? -1 : 1;
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

function processElevatorTick(elevator: Elevator, now: number): void {
  if (elevator.doorOpen) return;

  const next = elevator.stops[0];
  if (next) {
    moveToward(elevator, next.floor, now, next);
    return;
  }
  prePositionIdle(elevator);
}

function serveStop(elevator: Elevator, stop: Stop, now: number): void {
  elevator.doorOpen = true;
  doorOpenUntil.set(elevator.id, now + DOOR_OPEN_DURATION_MS);

  for (const requestId of stop.requestIds) {
    if (stop.type === 'pickup') {
      elevator.passengers += 1;
      assignRequestToElevator(requestId, elevator.id, now);
    } else {
      elevator.passengers = Math.max(0, elevator.passengers - 1);
      assignRequestToElevator(requestId, elevator.id, undefined, now);
    }
  }

  elevator.stops.shift();
}
