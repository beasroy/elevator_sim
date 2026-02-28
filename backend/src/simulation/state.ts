// In-memory state: elevators[], requests[]; getters/setters for API and simulation loop.

import type { Elevator } from '../models/Elevator';
import type { Request } from '../models/Request';
import type { Stop } from '../models/Stop';
import { defaults } from '../config/defaults';

let elevators: Elevator[] = [];
let requests: Request[] = [];
let numFloors: number = defaults.numFloors;
let numElevators: number = defaults.numElevators;
let simTimeMs: number = defaults.startTimeMs;
let startTimeMs: number = defaults.startTimeMs;
let speedMultiplier: number = 1;
let requestFrequencyMs: number = defaults.requestFrequencyMs;
let isRunning: boolean = false;

function homeFloor(index: number, nElevators: number, nFloors: number): number {
  if (nElevators <= 1) return Math.floor((nFloors - 1) / 2);
  return Math.round(index * (nFloors - 1) / (nElevators - 1));
}

function createElevator(id: string, index: number): Elevator {
  return {
    id,
    currentFloor: homeFloor(index, numElevators, numFloors),
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

/** Unassigned, non-rejected requests. */
export function getPendingRequests(): Request[] {
  return requests.filter(
    (r) => r.assignedElevatorId == null && r.rejectedAt == null
  );
}

export function getPendingCount(): number {
  let count = 0;
  for (const r of requests) {
    if (r.assignedElevatorId == null && r.rejectedAt == null) count++;
  }
  return count;
}

/**
 * Remove completed requests older than `maxAge` (sim-ms) to bound array growth.
 * Keeps rejected requests so metrics can still count them.
 */
export function drainCompleted(now: number, maxAge: number): void {
  requests = requests.filter(
    (r) => r.completionTime == null || now - r.completionTime < maxAge
  );
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

export function getStartTimeMs(): number {
  return startTimeMs;
}

export function setStartTimeMs(ms: number): void {
  startTimeMs = ms;
}

export function getSpeedMultiplier(): number {
  return speedMultiplier;
}

export function setSpeedMultiplier(speed: number): void {
  speedMultiplier = speed;
}

export function getRequestFrequencyMs(): number {
  return requestFrequencyMs;
}

export function setRequestFrequencyMs(ms: number): void {
  requestFrequencyMs = ms;
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
  requestFrequencyMs = defaults.requestFrequencyMs;
  requests = [];
  simTimeMs = startTimeMs;
  isRunning = false;
  elevators = Array.from({ length: numElevators }, (_, i) =>
    createElevator(`elevator-${i}`, i)
  );
}

/** Initialize elevators only (e.g. after config change). */
export function initElevators(): void {
  elevators = Array.from({ length: numElevators }, (_, i) =>
    createElevator(`elevator-${i}`, i)
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


export function unassignRequest(requestId: string): void {
  const request = requests.find((r) => r.id === requestId);
  if (!request) return;
  request.assignedElevatorId = undefined;
  request.pickupTime = undefined;
}
