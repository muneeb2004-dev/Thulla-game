// Live scoreboard showing tricks won per player, sorted by score.
export default function ScoreBoard({ players = [], scores = {}, tricksPlayed = 0, totalTricks = 13 }) {
  const ranked = [...players]
    .map((p) => ({ ...p, score: scores[p.id] || 0 }))
    .sort((a, b) => b.score - a.score);

  const pct = totalTricks > 0 ? Math.round((tricksPlayed / totalTricks) * 100) : 0;

  return (
    <div className="bg-glass rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Score
        </h3>
        <span className="text-xs text-slate-500">
          Trick {tricksPlayed}/{totalTricks}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Player rows */}
      <div className="flex flex-col gap-2">
        {ranked.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2">
            <span className="text-xs w-4 text-slate-500 font-mono">
              {i + 1}.
            </span>
            <span className="flex-1 text-sm text-slate-200 truncate font-medium">
              {p.name}
            </span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums w-8 text-right">
              {p.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
