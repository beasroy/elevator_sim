// When a floor request arrives, filter eligible elevators, score (lower = better), assign and insert pickup + dropoff.

import type { Elevator } from '../models/Elevator';
import type { Request } from '../models/Request';
import type { Stop } from '../models/Stop';
import { defaults } from '../config/defaults';
import { reorderStops } from './scheduling';

// Elevator is eligible if: idle, or same direction and will pass request floor, or can serve after reversing.

export function isEligible(elevator: Elevator, request: Request): boolean {
  const { currentFloor, direction } = elevator;
  const origin = request.originFloor;
  const reqDir = request.direction;

  if (direction === 'idle') return true;

  if (reqDir === 'up') {
    if (direction === 'up') return currentFloor <= origin; 
    if (direction === 'down') return currentFloor > origin; 
  } else {
    if (direction === 'down') return currentFloor >= origin; 
    if (direction === 'up') return currentFloor < origin; 
  }
  return false;
}

// Estimated time (simplified: distance + penalty per stop in the way). Lower = better.

function estimatedWaitTime(elevator: Elevator, request: Request): number {
  const distance = Math.abs(elevator.currentFloor - request.originFloor);
  const stopsInWay = elevator.stops.filter((s) => {
    if (elevator.direction === 'up')
      return s.floor >= elevator.currentFloor && s.floor <= request.originFloor;
    if (elevator.direction === 'down')
      return s.floor <= elevator.currentFloor && s.floor >= request.originFloor;
    return true;
  }).length;
  return distance + stopsInWay * 2; 
}

// Starvation: if request waited > 30s, heavily favor (subtract from score).

function starvationBoost(request: Request, now: number): number {
  const waited = now - request.timestamp;
  if (waited >= defaults.starvationThresholdMs) return 1000; 
  return 0;
}

// Rush bias: lobby → upper floor during rush: prefer elevators at/near lobby or fewer stops.

function rushBias(
  elevator: Elevator,
  request: Request,
  isRush: boolean
): number {
  if (!isRush || request.originFloor !== defaults.lobbyFloor || request.direction !== 'up')
    return 0;
  const atLobby = elevator.currentFloor === defaults.lobbyFloor ? 50 : 0;
  const nearLobby = elevator.currentFloor <= 1 ? 20 : 0;
  const fewerStops = Math.max(0, 20 - elevator.stops.length);
  return atLobby + nearLobby + fewerStops; 
}

// Utilization: penalty for many passengers or many stops (spread load).

function utilizationPenalty(elevator: Elevator): number {
  return elevator.passengers * 3 + elevator.stops.length * 2;
}

export interface AssignmentOptions {
  now: number;
  isRushWindow?: boolean;
}

/**
 * Score an elevator for a request (lower = better).
 * Combines: estimated wait, starvation boost, rush bias, utilization penalty.
 */
export function scoreElevator(
  elevator: Elevator,
  request: Request,
  options: AssignmentOptions
): number {
  const { now, isRushWindow = false } = options;
  let score = estimatedWaitTime(elevator, request);
  score -= starvationBoost(request, now);
  score -= rushBias(elevator, request, isRushWindow);
  score += utilizationPenalty(elevator);
  return score;
}

// Pick best eligible elevator (lowest score). Returns undefined if none eligible.

export function chooseElevator(
  elevators: Elevator[],
  request: Request,
  options: AssignmentOptions
): Elevator | undefined {
  const eligible = elevators.filter((e) => isEligible(e, request));
  if (eligible.length === 0) return undefined;
  let best = eligible[0];
  let bestScore = scoreElevator(best, request, options);
  for (let i = 1; i < eligible.length; i++) {
    const s = scoreElevator(eligible[i], request, options);
    if (s < bestScore) {
      bestScore = s;
      best = eligible[i];
    }
  }
  return best;
}

// Create pickup and dropoff stops for a request.

export function createStopsForRequest(request: Request): Stop[] {
  const pickup: Stop = {
    floor: request.originFloor,
    type: 'pickup',
    requestIds: [request.id],
  };
  const dropoff: Stop = {
    floor: request.destFloor,
    type: 'dropoff',
    requestIds: [request.id],
  };
  return [pickup, dropoff];
}

/**
 * Assign request to the best elevator: add pickup and dropoff stops, reorder by SCAN, set request.assignedElevatorId.
 * Mutates elevator and request. Returns the chosen elevator or undefined if none eligible.
 */

export function assignRequest(
  elevators: Elevator[],
  request: Request,
  options: AssignmentOptions
): Elevator | undefined {
  const elevator = chooseElevator(elevators, request, options);
  if (!elevator) return undefined;

  const stops = createStopsForRequest(request);
  elevator.stops.push(...stops);
  reorderStops(elevator);
  request.assignedElevatorId = elevator.id;
  return elevator;
}
