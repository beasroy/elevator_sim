// call assignment then scheduling; single API for "handle new request".

import type { Request } from '../models/Request';
import { assignRequest } from './assignment';
import { getElevators, getPendingRequests } from '../simulation/state';
import { isRushWindow } from '../config/defaults';

export interface HandleRequestOptions {
  now: number;
}

/**
 * Handle a new floor request: assign to best elevator and insert pickup/dropoff in SCAN order.
 * Mutates state (elevators and request). Returns the assigned elevator id or undefined.
 */
export function handleNewRequest(
  request: Request,
  options: HandleRequestOptions
): string | undefined {
  const elevators = getElevators();
  const elevator = assignRequest(elevators, request, {
    now: options.now,
    isRushWindow: isRushWindow(options.now),
  });
  return elevator?.id;
}

const RETRY_INTERVAL_MS = 2000;
let lastRetrySimTimeMs = 0;

/**
 * Re-attempt assignment for requests that had no eligible elevator on first try.
 * Called each tick; throttled to run every RETRY_INTERVAL_MS of sim-time.
 */
export function retryPendingRequests(now: number): void {
  if (now - lastRetrySimTimeMs < RETRY_INTERVAL_MS) return;
  lastRetrySimTimeMs = now;

  const pending = getPendingRequests();
  if (pending.length === 0) return;

  const elevators = getElevators();
  const rush = isRushWindow(now);

  for (const request of pending) {
    assignRequest(elevators, request, { now, isRushWindow: rush });
  }
}

export function resetRetryTimer(): void {
  lastRetrySimTimeMs = 0;
}

export { assignRequest, chooseElevator, isEligible, scoreElevator } from './assignment';
export {
  orderStopsForElevator,
  partitionStops,
  reorderStops,
  type ReorderOptions,
} from './scheduling';

