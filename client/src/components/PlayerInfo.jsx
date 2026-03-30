// Per-player info panel — name, avatar, card count, turn indicator.
const AVATARS = ["🦊","🐺","🦁","🐯","🦅","🐉","🦄","🐻"];

function getAvatar(name = "") {
  const code = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATARS[code % AVATARS.length];
}

export default function PlayerInfo({ player, isCurrentTurn, isSelf = false, score = 0, isSafe = false }) {
  if (!player) return null;

  return (
    <div
      id={`player-${player.id}`}
      className={[
        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-300",
        isSafe
          ? "bg-emerald-500/8 border-emerald-500/30 opacity-75"
          : isCurrentTurn
          ? "bg-glass border-blue-500/50 animate-pulse-glow"
          : "bg-glass border-white/5",
        isSelf ? "order-last" : "",
      ].join(" ")}
    >
      {/* Avatar */}
      <div
        className={[
          "w-10 h-10 rounded-full flex items-center justify-center text-xl",
          "border-2 transition-all duration-300 flex-shrink-0",
          isSafe
            ? "border-emerald-500/50"
            : isCurrentTurn
            ? "border-blue-400 scale-110"
            : "border-white/10",
        ].join(" ")}
        style={{ background: "rgba(30,58,95,0.8)" }}
      >
        {isSafe ? "🛡️" : getAvatar(player.name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate text-slate-100">
            {player.name}
          </span>
          {isSelf && <span className="badge badge-blue text-[10px]">You</span>}
          {player.isHost && <span className="badge badge-amber text-[10px]">Host</span>}
          {isSafe && <span className="badge badge-green text-[10px]">SAFE</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500">
            {isSafe ? "0" : (player.cardCount ?? player.hand?.length ?? 0)} cards
          </span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-emerald-400 font-semibold">{score} tricks</span>
        </div>
      </div>

      {/* Indicators */}
      {isSafe && (
        <span className="text-emerald-400 text-sm font-bold flex-shrink-0">✓</span>
      )}
      {!isSafe && isCurrentTurn && (
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
      )}
    </div>
  );
}
