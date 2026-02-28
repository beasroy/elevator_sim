import { useState, useEffect } from 'react';

interface Props {
  readonly isRunning: boolean;
  readonly speedMultiplier: number;
  readonly requestFrequencyMs: number;
  readonly numFloors: number;
  readonly numElevators: number;
  readonly startTimeMs: number;
  readonly onStart: () => void;
  readonly onStop: () => void;
  readonly onReset: () => void;
  readonly onConfigure: (cfg: {
    numFloors?: number;
    numElevators?: number;
    speed?: number;
    requestFrequencyMs?: number;
    startTimeMs?: number;
  }) => void;
}

function msToTimeStr(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeStrToMs(str: string): number {
  const [h, m] = str.split(':').map(Number);
  return (h || 0) * 3600000 + (m || 0) * 60000;
}

const SPEED_OPTIONS = [1, 2, 5];

export default function ControlsPanel({
  isRunning,
  speedMultiplier,
  requestFrequencyMs,
  numFloors,
  numElevators,
  startTimeMs,
  onStart,
  onStop,
  onReset,
  onConfigure,
}: Props) {
  const [floors, setFloors] = useState(numFloors);
  const [elevators, setElevators] = useState(numElevators);
  const [freq, setFreq] = useState(requestFrequencyMs);
  const [simStart, setSimStart] = useState(msToTimeStr(startTimeMs));

  useEffect(() => setFloors(numFloors), [numFloors]);
  useEffect(() => setElevators(numElevators), [numElevators]);
  useEffect(() => setFreq(requestFrequencyMs), [requestFrequencyMs]);
  useEffect(() => setSimStart(msToTimeStr(startTimeMs)), [startTimeMs]);

  return (
    <div className="bg-gray-900 rounded-xl p-5 space-y-5 border border-gray-700/50">
      {/* Simulation Controls */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Simulation
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onStart}
            disabled={isRunning}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              bg-emerald-600 hover:bg-emerald-500 text-white
              disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Start
          </button>
          <button
            onClick={onStop}
            disabled={!isRunning}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              bg-amber-600 hover:bg-amber-500 text-white
              disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Stop
          </button>
          <button
            onClick={onReset}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              bg-red-600 hover:bg-red-500 text-white"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Speed */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Speed
        </h3>
        <div className="flex gap-1.5">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onConfigure({ speed: s })}
              className={`flex-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${
                  speedMultiplier === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Parameters
        </h3>

        <label className="flex items-center justify-between text-sm text-gray-300">
          <span>Floors</span>
          <input
            type="number"
            min={2}
            max={50}
            value={floors}
            onChange={(e) => setFloors(+e.target.value)}
            onBlur={() => onConfigure({ numFloors: floors })}
            className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-right
              text-gray-100 focus:outline-none focus:border-indigo-500"
          />
        </label>

        <label className="flex items-center justify-between text-sm text-gray-300">
          <span>Elevators</span>
          <input
            type="number"
            min={1}
            max={10}
            value={elevators}
            onChange={(e) => setElevators(+e.target.value)}
            onBlur={() => onConfigure({ numElevators: elevators })}
            className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-right
              text-gray-100 focus:outline-none focus:border-indigo-500"
          />
        </label>

        <label className="flex items-center justify-between text-sm text-gray-300">
          <span>Req. freq (ms)</span>
          <input
            type="number"
            min={500}
            max={30000}
            step={500}
            value={freq}
            onChange={(e) => setFreq(+e.target.value)}
            onBlur={() => onConfigure({ requestFrequencyMs: freq })}
            className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-right
              text-gray-100 focus:outline-none focus:border-indigo-500"
          />
        </label>

        <label className="flex items-center justify-between text-sm text-gray-300">
          <span>Start time</span>
          <input
            type="time"
            value={simStart}
            onChange={(e) => setSimStart(e.target.value)}
            onBlur={() => onConfigure({ startTimeMs: timeStrToMs(simStart) })}
            className="w-28 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-right
              text-gray-100 focus:outline-none focus:border-indigo-500
              scheme-dark"
          />
        </label>
      </div>
    </div>
  );
}
