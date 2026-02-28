import type { Metrics } from '../types';

interface Props {
  readonly metrics: Metrics;
  readonly simTimeMs: number;
  readonly totalRequests: number;
}

function fmt(ms: number): string {
  if (!ms || !Number.isFinite(ms)) return '—';
  return (ms / 1000).toFixed(1) + 's';
}

function fmtClock(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function MetricsPanel({ metrics, simTimeMs, totalRequests }: Props) {
  const cards: { label: string; value: string }[] = [
    { label: 'Sim Time', value: fmtClock(simTimeMs) },
    { label: 'Requests', value: String(totalRequests) },
    { label: 'Avg Wait', value: fmt(metrics.averageWaitTimeMs) },
    { label: 'Max Wait', value: fmt(metrics.maxWaitTimeMs) },
    { label: 'Avg Travel', value: fmt(metrics.averageTravelTimeMs) },
  ];

  const utilEntries = Object.entries(metrics.utilization);

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-700/50 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Metrics
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-gray-800/60 rounded-lg px-3 py-2"
          >
            <div className="text-[10px] uppercase tracking-wide text-gray-500">
              {c.label}
            </div>
            <div className="text-lg font-semibold text-gray-100">{c.value}</div>
          </div>
        ))}
      </div>

      {utilEntries.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wide text-gray-500 mb-2">
            Utilization
          </h4>
          <div className="space-y-1.5">
            {utilEntries.map(([id, pct]) => (
              <div key={id} className="flex items-center gap-2 text-xs text-gray-300">
                <span className="w-8 shrink-0 truncate">E{id.replace('elevator-', '')}</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pct * 100, 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right tabular-nums">
                  {(pct * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
