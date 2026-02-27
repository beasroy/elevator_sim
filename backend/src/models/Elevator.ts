import type { Stop } from './Stop';

//Elevator state for simulation and scheduling.
 
export type ElevatorDirection = 'up' | 'down' | 'idle';

export interface Elevator {
  id: string;
  currentFloor: number;
  direction: ElevatorDirection;
  doorOpen: boolean;
  passengers: number;
  stops: Stop[];
}
