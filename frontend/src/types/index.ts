export type ElevatorDirection = 'up' | 'down' | 'idle';
export type RequestDirection = 'up' | 'down';

export interface Stop {
  floor: number;
  type: 'pickup' | 'dropoff';
  requestIds: string[];
}

export interface Elevator {
  id: string;
  currentFloor: number;
  direction: ElevatorDirection;
  doorOpen: boolean;
  passengers: number;
  stops: Stop[];
}

export interface Request {
  id: string;
  timestamp: number;
  originFloor: number;
  destFloor: number;
  direction: RequestDirection;
  assignedElevatorId?: string;
  pickupTime?: number;
  completionTime?: number;
}

export interface Metrics {
  averageWaitTimeMs: number;
  maxWaitTimeMs: number;
  averageTravelTimeMs: number;
  utilization: Record<string, number>;
}

export interface MetricsResponse {
  simTimeMs: number;
  isRunning: boolean;
  speedMultiplier: number;
  requestFrequencyMs: number;
  numFloors: number;
  numElevators: number;
  elevators: Elevator[];
  requests: Request[];
  metrics: Metrics;
}
