// Compute: per-request wait/travel times, max wait, utilization per elevator.

import type { Request } from '../models/Request';
import type { Elevator } from '../models/Elevator';

export function averageWaitTimeMs(requests: Request[]): number | null {
  const withPickup = requests.filter((r) => r.pickupTime != null);
  if (withPickup.length === 0) return null;
  const sum = withPickup.reduce((acc, r) => acc + (r.pickupTime! - r.timestamp), 0);
  return sum / withPickup.length;
}

export function maxWaitTimeMs(requests: Request[]): number | null {
  const withPickup = requests.filter((r) => r.pickupTime != null);
  if (withPickup.length === 0) return null;
  return Math.max(...withPickup.map((r) => r.pickupTime! - r.timestamp));
}

export function averageTravelTimeMs(requests: Request[]): number | null {
  const withCompletion = requests.filter(
    (r) => r.completionTime != null && r.pickupTime != null
  );
  if (withCompletion.length === 0) return null;
  const sum = withCompletion.reduce(
    (acc, r) => acc + (r.completionTime! - r.pickupTime!),
    0
  );
  return sum / withCompletion.length;
}

export function utilizationPerElevator(elevators: Elevator[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of elevators) {
    const busy = e.stops.length + e.passengers;
    out[e.id] = Math.min(busy / 10, 1);
  }
  return out;
}
