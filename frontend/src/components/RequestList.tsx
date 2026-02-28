import type { Request } from '../types';
import { useMemo } from 'react';

interface Props {
  requests: Request[];
}

type Status = 'waiting' | 'in-elevator' | 'completed';

function status(r: Request): Status {
  if (r.completionTime != null) return 'completed';
  if (r.pickupTime != null) return 'in-elevator';
  return 'waiting';
}

const STATUS_BADGE: Record<Status, string> = {
  waiting: 'bg-amber-500/20 text-amber-400',
  'in-elevator': 'bg-indigo-500/20 text-indigo-400',
  completed: 'bg-emerald-500/20 text-emerald-400',
};

const MAX_VISIBLE = 100;

export default function RequestList({ requests }: Props) {
  const sorted = useMemo(() => {
    const copy = [...requests];
    copy.sort((a, b) => b.timestamp - a.timestamp);
    return copy;
  }, [requests]);

  const visible = sorted.slice(0, MAX_VISIBLE);
  const hidden = sorted.length - visible.length;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700/50 p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Requests
        </h3>
        {hidden > 0 && (
          <span className="text-[10px] text-gray-500">+{hidden} more</span>
        )}
      </div>

      <div className="space-y-1 flex-1 overflow-y-auto pr-1 min-h-0">
        {visible.map((r) => {
          const s = status(r);
          return (
            <div
              key={r.id}
              className="flex items-center gap-2 text-xs text-gray-300 py-1 px-2 rounded-md
                bg-gray-800/40 hover:bg-gray-800/70 transition-colors"
            >
              <span className="font-mono text-gray-500 w-8 shrink-0 text-right">
                #{r.id.slice(-4)}
              </span>
              <span>
                F{r.originFloor}{' '}
                <span className={r.direction === 'up' ? 'text-emerald-400' : 'text-amber-400'}>
                  {r.direction === 'up' ? '→' : '→'}
                </span>{' '}
                F{r.destFloor}
              </span>
              <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_BADGE[s]}`}>
                {s}
              </span>
            </div>
          );
        })}
        {requests.length === 0 && (
          <div className="text-xs text-gray-600 text-center py-4">No requests yet</div>
        )}
      </div>
    </div>
  );
}
