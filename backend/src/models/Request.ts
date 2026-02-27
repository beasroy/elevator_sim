//A passenger request (floor request or destination).

export type RequestDirection = 'up' | 'down';

export interface Request {
  id: string;
  timestamp: number;
  originFloor: number;
  destFloor: number;
  direction: RequestDirection; //Direction from origin (up = destFloor > originFloor, down = destFloor < originFloor)
  assignedElevatorId?: string;
  pickupTime?: number;
  completionTime?: number;
}
