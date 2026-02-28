import type { Elevator, Request } from '../types';
import ElevatorCar from './ElevatorCar';
import FloorPanel from './FloorPanel';
import { useMemo } from 'react';

interface Props {
  readonly elevators: Elevator[];
  readonly requests: Request[];
  readonly numFloors: number;
  readonly elevatorCapacity: number;
}

export default function Building({ elevators, requests, numFloors, elevatorCapacity }: Props) {
  const floorRequests = useMemo(() => {
    const up = new Set<number>();
    const down = new Set<number>();
    for (const r of requests) {
      if (r.completionTime != null) continue;
      if (r.pickupTime != null) continue;
      if (r.direction === 'up') up.add(r.originFloor);
      else down.add(r.originFloor);
    }
    return { up, down };
  }, [requests]);

  const floors = useMemo(() => {
    const arr: number[] = [];
    for (let f = numFloors - 1; f >= 0; f--) arr.push(f);
    return arr;
  }, [numFloors]);

  const floorH = Math.max(36, Math.min(56, 500 / numFloors));

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700/50 p-4 flex gap-0 overflow-hidden h-full">
      {/* Floor labels & request indicators */}
      <div className="flex flex-col shrink-0 w-16">
        {floors.map((f) => (
          <div key={f} style={{ height: floorH }} className="flex items-center">
            <FloorPanel
              floor={f}
              numFloors={numFloors}
              hasUpRequest={floorRequests.up.has(f)}
              hasDownRequest={floorRequests.down.has(f)}
            />
          </div>
        ))}
      </div>

      {/* Elevator shafts */}
      <div className="flex flex-1 gap-1.5">
        {elevators.map((elev) => (
          <div
            key={elev.id}
            className="relative flex-1 rounded-lg border border-gray-800/60 overflow-hidden"
            style={{
              height: floorH * numFloors,
              minWidth: 48,
              background: 'linear-gradient(to top, #111827, #1f2937)',
            }}
          >
            {/* Floor grid lines */}
            {floors.map((f) => (
              <div
                key={f}
                className="absolute left-0 right-0 border-b border-gray-700/20"
                style={{
                  bottom: `${(f / numFloors) * 100}%`,
                }}
              />
            ))}

            {/* Elevator label at top */}
            <div className="absolute top-1 left-0 right-0 text-center">
              <span className="text-[9px] font-semibold text-gray-500 uppercase">
                E{elev.id.replace('elevator-', '')}
              </span>
            </div>

            <ElevatorCar elevator={elev} numFloors={numFloors} capacity={elevatorCapacity} />
          </div>
        ))}
      </div>
    </div>
  );
}
