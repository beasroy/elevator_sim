// In-memory state: elevators[], requests[]; getters/setters for API and simulation loop.

import type { Elevator } from '../models/Elevator';
import type { Request } from '../models/Request';
import type { Stop } from '../models/Stop';
import { defaults } from '../config/defaults';

let elevators: Elevator[] = [];
let requests: Request[] = [];
let numFloors: number = defaults.numFloors;
let numElevators: number = defaults.numElevators;
let simTimeMs: number = 0;
let speedMultiplier: number = 1;
let isRunning: boolean = false;

function createElevator(id: string): Elevator {
  return {
    id,
    currentFloor: 0,
    direction: 'idle',
    doorOpen: false,
    passengers: 0,
    stops: [],
  };
}

export function getElevators(): Elevator[] {
  return elevators;
}

export function getRequests(): Request[] {
  return requests;
}

/** Unassigned requests (no assignedElevatorId). */
export function getPendingRequests(): Request[] {
  return requests.filter((r) => r.assignedElevatorId == null);
}

export function getNumFloors(): number {
  return numFloors;
}

export function getNumElevators(): number {
  return numElevators;
}

export function setNumFloors(n: number): void {
  numFloors = n;
}

export function setNumElevators(n: number): void {
  numElevators = n;
}

export function getSimTimeMs(): number {
  return simTimeMs;
}

export function setSimTimeMs(ms: number): void {
  simTimeMs = ms;
}

export function getSpeedMultiplier(): number {
  return speedMultiplier;
}

export function setSpeedMultiplier(speed: number): void {
  speedMultiplier = speed;
}

export function getIsRunning(): boolean {
  return isRunning;
}

export function setIsRunning(running: boolean): void {
  isRunning = running;
}

/** Reset state and create n elevators, for start/reset. */
export function resetState(): void {
  numFloors = defaults.numFloors;
  numElevators = defaults.numElevators;
  requests = [];
  simTimeMs = 0;
  isRunning = false;
  elevators = Array.from({ length: numElevators }, (_, i) =>
    createElevator(`elevator-${i}`)
  );
}

/** Initialize elevators only (e.g. after config change). */
export function initElevators(): void {
  elevators = Array.from({ length: numElevators }, (_, i) =>
    createElevator(`elevator-${i}`)
  );
}

export function addRequest(request: Request): void {
  requests.push(request);
}

export function getRequestById(id: string): Request | undefined {
  return requests.find((r) => r.id === id);
}

// Assign request to elevator by adding pickup and dropoff stops. Caller (scheduler) provides the stops to add.
export function addStopsToElevator(
  elevatorId: string,
  newStops: Stop[]
): void {
  const elevator = elevators.find((e) => e.id === elevatorId);
  if (!elevator) return;
  elevator.stops.push(...newStops);
}

// Set request's assigned elevator and optionally pickup/completion times.
export function assignRequestToElevator(
  requestId: string,
  elevatorId: string,
  pickupTime?: number,
  completionTime?: number
): void {
  const request = requests.find((r) => r.id === requestId);
  if (!request) return;
  request.assignedElevatorId = elevatorId;
  if (pickupTime != null) request.pickupTime = pickupTime;
  if (completionTime != null) request.completionTime = completionTime;
}

export function getElevatorById(id: string): Elevator | undefined {
  return elevators.find((e) => e.id === id);
}
