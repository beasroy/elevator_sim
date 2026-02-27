// call assignment then scheduling; single API for "handle new request".

import type { Request } from '../models/Request';
import { assignRequest } from './assignment';
import { getElevators } from '../simulation/state';
import { isRushWindow } from '../config/defaults';

export interface HandleRequestOptions {
  // Current simulation time (ms). Used for starvation and rush.
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

export { assignRequest, chooseElevator, isEligible, scoreElevator } from './assignment';
export {
  orderStopsForElevator,
  partitionStops,
  reorderStops,
  type ReorderOptions,
} from './scheduling';

