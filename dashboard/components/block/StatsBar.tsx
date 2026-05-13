export function StatsBar({
  pendingCount,
  autoSentCount,
  approvedCount,
  avgToneScore,
}: {
  pendingCount: number;
  autoSentCount: number;
  approvedCount: number;
  avgToneScore: number | null;
}) {
  return (
    <div
      className="component-StatsBar bg-white border-t border-dpw-border px-6 py-2 flex items-center gap-6 flex-shrink-0 text-[11px] text-dpw-muted"
    >
      <StatDot color="dpw-gold" value={pendingCount} label="awaiting approval" />
      <StatDot color="dpw-green" value={autoSentCount} label="auto-sent today" />
      <StatDot color="dpw-blue" value={approvedCount} label="manually approved" />

      <div className="ml-auto flex items-center gap-4">
        {avgToneScore != null && (
          <span>
            AI tone accuracy:{' '}
            <strong className="text-dpw-green">{avgToneScore}%</strong>
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-dpw-green animate-pulse" />
          System online
        </div>
      </div>
    </div>
  )
}

function StatDot({
  color,
  value,
  label,
}: {
  color: string
  value: number
  label: string
}) {
  const colorMap: Record<string, string> = {
    'dpw-gold': 'bg-dpw-gold',
    'dpw-green': 'bg-dpw-green',
    'dpw-blue': 'bg-dpw-blue',
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${colorMap[color]}`} />
      <strong className="text-dpw-text">{value}</strong>
      <span>{label}</span>
    </div>
  )
}