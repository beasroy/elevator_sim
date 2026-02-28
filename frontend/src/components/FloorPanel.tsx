interface Props {
  floor: number;
  hasUpRequest: boolean;
  hasDownRequest: boolean;
  numFloors: number;
}

export default function FloorPanel({
  floor,
  hasUpRequest,
  hasDownRequest,
}: Props) {
  return (
    <div className="flex items-center gap-1.5 w-full border-b border-gray-800/50 px-2 h-full">
      <span className="text-xs font-mono text-gray-400 w-5 text-right shrink-0">
        {floor === 0 ? 'L' : floor}
      </span>
      <div className="flex gap-0.5">
        {hasUpRequest && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Up request" />
        )}
        {hasDownRequest && (
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Down request" />
        )}
        {!hasUpRequest && !hasDownRequest && (
          <span className="w-2 h-2 rounded-full bg-gray-800" />
        )}
      </div>
    </div>
  );
}
