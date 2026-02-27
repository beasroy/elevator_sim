//A single stop in an elevator's schedule.

export interface Stop {
  floor: number;
  type: 'pickup' | 'dropoff';
  requestIds: string[];
}
