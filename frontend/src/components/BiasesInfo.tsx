const BIASES = [
  { label: 'Starvation Escalation', desc: 'Requests waiting >30s get top priority' },
  { label: 'Lobby Rush Bias', desc: '70% lobby→upper during rush hour (9 AM window)' },
  { label: 'Utilization Balance', desc: 'Busy elevators penalized during assignment' },
  { label: 'SCAN Scheduling', desc: 'Elevators sweep up then down to reduce reversals' },
  { label: 'Pre-positioning', desc: 'Idle elevators return to lobby automatically' },
];

export default function BiasesInfo() {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700/50 p-5 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Scheduling Biases
      </h3>
      <ul className="space-y-2">
        {BIASES.map((b) => (
          <li key={b.label} className="text-xs text-gray-300">
            <span className="font-medium text-gray-100">{b.label}</span>
            <span className="text-gray-500"> — {b.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
