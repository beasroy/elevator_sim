import type { Elevator } from '../types';

interface Props {
  readonly elevator: Elevator;
  readonly numFloors: number;
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

export default function ElevatorCar({ elevator, numFloors }: Props) {
  const floorFrac = 100 / numFloors;
  const translateY = -elevator.currentFloor * 100;

  const isPrePositioning =
    elevator.stops.length === 0 && elevator.direction !== 'idle';

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
          transition-all duration-300
          ${
            elevator.doorOpen
              ? 'border-indigo-400 shadow-[0_0_14px_rgba(99,102,241,0.5)]'
              : 'border-gray-500 bg-gray-700/80'
          }`}
      >
        {/* Door panels — slide apart when open */}
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

        {/* Interior visible when doors open */}
        {elevator.doorOpen && (
          <div className="absolute inset-0 bg-indigo-500/20" />
        )}

        {/* Info overlay */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center gap-0.5">
          {/* Direction */}
          <span className={`text-[10px] leading-none font-bold ${directionColor(elevator.direction)}`}>
            {directionIcon(elevator.direction)}
          </span>

          {/* Passenger count */}
          <div className="flex items-center gap-0.5">
            <span className="text-[9px] leading-none text-gray-400">👤</span>
            <span className="text-[11px] leading-none font-bold text-gray-100">
              {elevator.passengers}
            </span>
          </div>

          {/* Door state label */}
          <span
            className={`text-[7px] uppercase font-semibold tracking-wider leading-none
              ${elevator.doorOpen ? 'text-indigo-300' : 'text-gray-500'}`}
          >
            {elevator.doorOpen ? 'Open' : 'Closed'}
          </span>
        </div>

        {/* Pre-positioning badge */}
        {isPrePositioning && (
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap
            text-[8px] bg-cyan-600/80 text-cyan-100 px-1 rounded z-20">
            Repositioning
          </span>
        )}
      </div>
    </div>
  );
}
