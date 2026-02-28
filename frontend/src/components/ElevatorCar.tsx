import type { Elevator } from '../types';

interface Props {
  readonly elevator: Elevator;
  readonly numFloors: number;
  readonly capacity: number;
}

function directionIcon(dir: Elevator['direction']) {
  switch (dir) {
    case 'up':
      return '▲';
    case 'down':
      return '▼';
    default:
      return '—';
  }
}

function directionColor(dir: Elevator['direction']) {
  switch (dir) {
    case 'up':
      return 'text-emerald-400';
    case 'down':
      return 'text-amber-400';
    default:
      return 'text-gray-500';
  }
}

function borderStyle(isFull: boolean, isNearFull: boolean, doorOpen: boolean): string {
  if (isFull) return 'border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.6)]';
  if (isNearFull) return 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]';
  if (doorOpen) return 'border-indigo-400 shadow-[0_0_14px_rgba(99,102,241,0.5)]';
  return 'border-gray-500 bg-gray-700/80';
}

function loadColor(isFull: boolean, isNearFull: boolean): string {
  if (isFull) return 'text-red-400';
  if (isNearFull) return 'text-amber-300';
  return 'text-gray-100';
}

function barColor(isFull: boolean, isNearFull: boolean): string {
  if (isFull) return 'bg-red-500';
  if (isNearFull) return 'bg-amber-400';
  return 'bg-emerald-500';
}

export default function ElevatorCar({ elevator, numFloors, capacity }: Props) {
  const floorFrac = 100 / numFloors;
  const translateY = -elevator.currentFloor * 100;

  const isPrePositioning =
    elevator.stops.length === 0 && elevator.direction !== 'idle';

  const loadRatio = capacity > 0 ? elevator.passengers / capacity : 0;
  const isFull = elevator.passengers >= capacity;
  const isNearFull = loadRatio >= 0.75 && !isFull;

  return (
    <div
      className="absolute left-1 right-1 bottom-0 transition-transform duration-500 ease-in-out z-10"
      style={{
        height: `${floorFrac}%`,
        transform: `translateY(${translateY}%)`,
      }}
    >
      <div
        className={`relative h-full rounded-md border overflow-hidden
          transition-all duration-300 ${borderStyle(isFull, isNearFull, elevator.doorOpen)}`}
      >
        {/* Door panels */}
        <div className="absolute inset-0 flex">
          <div
            className={`h-full bg-gray-600/90 border-r border-gray-500/50
              transition-all duration-300 ease-in-out
              ${elevator.doorOpen ? 'w-0' : 'w-1/2'}`}
          />
          <div
            className={`h-full bg-gray-600/90 border-l border-gray-500/50
              transition-all duration-300 ease-in-out
              ${elevator.doorOpen ? 'w-0' : 'w-1/2'}`}
          />
        </div>

        {elevator.doorOpen && (
          <div className="absolute inset-0 bg-indigo-500/20" />
        )}

        {/* Info overlay */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center gap-0.5">
          <span className={`text-[10px] leading-none font-bold ${directionColor(elevator.direction)}`}>
            {directionIcon(elevator.direction)}
          </span>

          <div className="flex items-center gap-0.5">
            <span className="text-[9px] leading-none text-gray-400">👤</span>
            <span className={`text-[11px] leading-none font-bold ${loadColor(isFull, isNearFull)}`}>
              {elevator.passengers}/{capacity}
            </span>
          </div>

          <span
            className={`text-[7px] uppercase font-semibold tracking-wider leading-none
              ${elevator.doorOpen ? 'text-indigo-300' : 'text-gray-500'}`}
          >
            {elevator.doorOpen ? 'Open' : 'Closed'}
          </span>
        </div>

        {isFull && (
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap
            text-[8px] bg-red-600/90 text-red-100 px-1.5 rounded font-bold z-20 animate-pulse">
            FULL
          </span>
        )}

        {isPrePositioning && !isFull && (
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap
            text-[8px] bg-cyan-600/80 text-cyan-100 px-1 rounded z-20">
            Repositioning
          </span>
        )}

        {/* Capacity bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-800/60 z-20">
          <div
            className={`h-full transition-all duration-300 ${barColor(isFull, isNearFull)}`}
            style={{ width: `${Math.min(loadRatio * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
