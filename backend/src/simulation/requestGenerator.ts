// Request generator: configurable n, k, frequency, rush profile.
// Random requests with timestamp, origin, destination; emits requests into state/scheduler.

import type { Request } from '../models/Request';
import { defaults, isRushWindow } from '../config/defaults';
import {
  getNumFloors,
  getRequestFrequencyMs,
  addRequest,
  getPendingCount,
} from './state';
import { handleNewRequest } from '../scheduler';

let lastEmitSimTimeMs = -defaults.requestFrequencyMs;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Create a new request with random origin/destination, or lobby→upper during rush.

function createRequest(now: number): Request {
  const numFloors = getNumFloors();
  const lobby = defaults.lobbyFloor;
  const isRush = isRushWindow(now);
  const useRushProfile =
    isRush && Math.random() < defaults.rushLobbyFraction;

  let originFloor: number;
  let destFloor: number;

  if (useRushProfile) {
    originFloor = lobby;
    destFloor = lobby + 1 <= numFloors - 1 ? randomInt(lobby + 1, numFloors - 1) : lobby;
    if (destFloor === originFloor && numFloors > 1) {
      destFloor = numFloors - 1;
    }
  } else {
    originFloor = randomInt(0, numFloors - 1);
    destFloor = randomInt(0, numFloors - 1);
    while (destFloor === originFloor) {
      destFloor = randomInt(0, numFloors - 1);
    }
  }

  const direction = destFloor > originFloor ? 'up' : 'down';
  const id = `req-${now}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    id,
    timestamp: now,
    originFloor,
    destFloor,
    direction,
  };
}

// Maybe emit one new request if enough sim time has passed since last emit.
// Call from the simulation loop each tick. Adds request to state and assigns to an elevator.

export function maybeEmitRequest(now: number): void {
  if (getNumFloors() < 2) return;
  const frequencyMs = getRequestFrequencyMs();
  const elapsed = now - lastEmitSimTimeMs;
  if (elapsed < frequencyMs) return;

  lastEmitSimTimeMs = now;
  const request = createRequest(now);
  if (request.originFloor === request.destFloor) return;

  if (getPendingCount() >= defaults.maxPendingRequests) {
    request.rejectedAt = now;
    addRequest(request);
    return;
  }

  addRequest(request);
  handleNewRequest(request, { now });
}

// Reset generator state (e.g. on simulation reset) so next emit uses frequency from now.

export function resetGenerator(): void {
  lastEmitSimTimeMs = -getRequestFrequencyMs();
}
