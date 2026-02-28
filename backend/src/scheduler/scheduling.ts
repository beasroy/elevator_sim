//Scheduling step: direction-aware queues (SCAN), priority overrides (e.g. 30s escalation).

import type { Elevator } from '../models/Elevator';
import type { Stop } from '../models/Stop';
import { defaults } from '../config/defaults';

export function partitionStops(elevator: Elevator): {
  up: Stop[];
  down: Stop[];
} {
  const current = elevator.currentFloor;
  const up: Stop[] = [];
  const down: Stop[] = [];
  for (const stop of elevator.stops) {
    if (stop.floor >= current) up.push(stop);
    else down.push(stop);
  }
  return { up, down };
}

export interface ReorderOptions {
  now: number;
  getRequestTimestamp?: (requestId: string) => number | undefined;
}


export function orderStopsForElevator(
  elevator: Elevator,
  options?: ReorderOptions
): Stop[] {
  const { up, down } = partitionStops(elevator);
  const threshold = defaults.starvationThresholdMs;

  const promoteStarved = (stops: Stop[], ascending: boolean): Stop[] => {
    const opts = options;
    const hasOverride =
      opts?.getRequestTimestamp != null && opts?.now != null;
    if (hasOverride) {
      const now = opts.now;
      const getTs = opts.getRequestTimestamp!;
      const starved: Stop[] = [];
      const rest: Stop[] = [];
      for (const stop of stops) {
        const isPickup = stop.type === 'pickup';
        const requestId = stop.requestIds[0];
        const ts = requestId ? getTs(requestId) : undefined;
        const waited = ts === undefined ? 0 : now - ts;
        const isStarved = isPickup && waited >= threshold;
        if (isStarved) starved.push(stop);
        else rest.push(stop);
      }
      rest.sort((a, b) => (ascending ? a.floor - b.floor : b.floor - a.floor));
      starved.sort((a, b) => (ascending ? a.floor - b.floor : b.floor - a.floor));
      return [...starved, ...rest];
    }
    return stops.sort((a, b) => (ascending ? a.floor - b.floor : b.floor - a.floor));
  };

  const upSorted = promoteStarved(up, true);
  const downSorted = promoteStarved(down, false);
  const scanOrder = [...upSorted, ...downSorted];
  return enforcePickupBeforeDropoff(scanOrder);
}

/**
 * Ensures every dropoff stop appears after its corresponding pickup stop.
 * SCAN ordering can place a dropoff before its pickup when they fall on
 * opposite sides of the elevator's current floor; this pass defers such
 * dropoffs until immediately after their pickup is encountered.
 */
function enforcePickupBeforeDropoff(stops: Stop[]): Stop[] {
  const pendingPickupIds = new Set<string>();
  for (const s of stops) {
    if (s.type === 'pickup') {
      for (const id of s.requestIds) pendingPickupIds.add(id);
    }
  }

  const result: Stop[] = [];
  const deferred: Stop[] = [];
  const pickedUp = new Set<string>();

  for (const stop of stops) {
    if (
      stop.type === 'dropoff' &&
      stop.requestIds.some((id) => pendingPickupIds.has(id) && !pickedUp.has(id))
    ) {
      deferred.push(stop);
      continue;
    }

    result.push(stop);

    if (stop.type === 'pickup') {
      for (const id of stop.requestIds) pickedUp.add(id);
      let i = 0;
      while (i < deferred.length) {
        const d = deferred[i];
        if (d.requestIds.every((id) => !pendingPickupIds.has(id) || pickedUp.has(id))) {
          result.push(d);
          deferred.splice(i, 1);
        } else {
          i++;
        }
      }
    }
  }

  result.push(...deferred);
  return result;
}


export function reorderStops(elevator: Elevator, options?: ReorderOptions): void {
  elevator.stops = orderStopsForElevator(elevator, options);
}
