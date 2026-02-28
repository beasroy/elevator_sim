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

  const steps = Math.floor(travelBudget / FLOOR_MS);
  for (let step = 0; step < steps; step++) {
    const stepTime = now + (step + 1) * FLOOR_MS;
    for (const elevator of elevators) {
      processElevatorTick(elevator, stepTime);
    }
  }

  for (const elevator of elevators) {
    elevator.doorOpen = false;
  }
}

function processElevatorTick(elevator: Elevator, now: number): void {
  const next = elevator.stops[0];
  if (!next) {
    elevator.direction = 'idle';
    return;
  }

  const current = elevator.currentFloor;
  if (current < next.floor) {
    elevator.direction = 'up';
    elevator.currentFloor = current + 1;
    if (elevator.currentFloor === next.floor) {
      serveStop(elevator, next, now);
    }
    return;
  }
  if (current > next.floor) {
    elevator.direction = 'down';
    elevator.currentFloor = current - 1;
    if (elevator.currentFloor === next.floor) {
      serveStop(elevator, next, now);
    }
    return;
  }
  serveStop(elevator, next, now);
}

function serveStop(elevator: Elevator, stop: Stop, now: number): void {
  elevator.doorOpen = true;

  for (const requestId of stop.requestIds) {
    if (stop.type === 'pickup') {
      elevator.passengers += 1;
      assignRequestToElevator(requestId, elevator.id, now);
    } else {
      elevator.passengers -= 1;
      assignRequestToElevator(requestId, elevator.id, undefined, now);
    }
  }

  elevator.stops.shift();
}
