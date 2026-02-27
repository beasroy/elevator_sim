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
  return [...upSorted, ...downSorted];
}


export function reorderStops(elevator: Elevator, options?: ReorderOptions): void {
  elevator.stops = orderStopsForElevator(elevator, options);
}
