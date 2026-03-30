// Game-ended modal — shows the Thulla loser prominently and celebrates safe players.
// Used for card-depletion win condition (gameEnded event).
const SUIT_BG = ["♠", "♥", "♦", "♣"];

export default function WinnerModal({ result, onPlayAgain, onLeave }) {
  if (!result) return null;

  const { loser, safePlayers = [] } = result;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,11,24,0.88)", backdropFilter: "blur(10px)" }}
    >
      {/* Floating suit symbols */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {SUIT_BG.map((s, i) => (
          <span
            key={i}
            className="absolute text-9xl opacity-5 animate-float"
            style={{
              left: `${8 + i * 22}%`,
              top: `${8 + (i % 2) * 65}%`,
              animationDelay: `${i * 0.6}s`,
            }}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Modal */}
      <div
        className="bg-glass rounded-3xl p-8 w-full max-w-md z-10 animate-pop-in
                   border border-rose-500/20 shadow-2xl"
        style={{ boxShadow: "0 0 60px rgba(244,63,94,0.15)" }}
      >
        {/* Loser section */}
        {loser && (
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">💀</div>
            <h2 className="text-3xl font-black mb-1" style={{ color: "#fb7185" }}>
              Thulla!
            </h2>
            <p className="text-slate-300 text-lg font-semibold">
              {loser.name} is the loser
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Stuck with {loser.handCount} card{loser.handCount !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Safe players */}
        {safePlayers.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              🛡️ Safe Players
            </p>
            <div className="flex flex-col gap-2">
              {safePlayers.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-xl
                             bg-emerald-500/10 border border-emerald-500/25"
                >
                  <span className="text-xl">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "✅"}
                  </span>
                  <span className="flex-1 font-semibold text-emerald-300">{p.name}</span>
                  <span className="badge badge-green text-[10px]">SAFE</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loser row */}
        {loser && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl mb-6
                       bg-rose-500/10 border border-rose-500/25"
          >
            <span className="text-xl">💀</span>
            <span className="flex-1 font-semibold text-rose-300">{loser.name}</span>
            <span className="badge badge-rose text-[10px]">THULLA LOSER</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            id="btn-play-again"
            className="btn btn-primary flex-1"
            onClick={onPlayAgain}
          >
            🔄 Play Again
          </button>
          <button
            id="btn-leave-game"
            className="btn btn-ghost flex-1"
            onClick={onLeave}
          >
            🚪 Leave
          </button>
        </div>
      </div>
    </div>
  );
}
