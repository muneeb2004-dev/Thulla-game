// The central game table — shows the pile (cards in play), leadSuit, turn info.
import Card from "./Card.jsx";

const SUIT_SYMBOLS = { hearts:"♥", diamonds:"♦", clubs:"♣", spades:"♠" };
const SUIT_COLORS  = { hearts:"suit-hearts", diamonds:"suit-diamonds", clubs:"suit-clubs", spades:"suit-spades" };

export default function GameBoard({
  pile = [],
  leadSuit,
  currentTurn,
  players = [],
  selfId,
}) {
  const currentPlayer = players.find((p) => (p.id ?? p) === currentTurn);
  const isMyTurn = currentTurn === selfId;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Turn banner */}
      <div
        className={[
          "px-5 py-2 rounded-full text-sm font-semibold border transition-all duration-300",
          isMyTurn
            ? "bg-blue-500/20 border-blue-500/50 text-blue-300 animate-pulse-glow"
            : "bg-white/5 border-white/10 text-slate-400",
        ].join(" ")}
      >
        {isMyTurn ? "⚡ Your turn!" : `⏳ ${currentPlayer?.name ?? "…"}'s turn`}
      </div>

      {/* Lead suit indicator */}
      {leadSuit && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Lead suit</span>
          <span className={`text-2xl ${SUIT_COLORS[leadSuit]}`}>
            {SUIT_SYMBOLS[leadSuit]}
          </span>
        </div>
      )}

      {/* Central table / pile */}
      <div
        className="relative flex items-center justify-center rounded-2xl border border-white/8"
        style={{
          width: "340px",
          height: "160px",
          background: "radial-gradient(ellipse at center, rgba(30,58,95,0.5) 0%, rgba(5,11,24,0.8) 100%)",
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.4), 0 0 40px rgba(59,130,246,0.08)",
        }}
      >
        {pile.length === 0 ? (
          <p className="text-slate-600 text-sm italic select-none">Waiting for first card…</p>
        ) : (
          <div className="flex items-center gap-2">
            {pile.map(({ playerId, card }, i) => {
              const player = players.find((p) => (p.id ?? p) === playerId);
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <Card card={card} faceDown={false} disabled />
                  <span className="text-[10px] text-slate-500 truncate max-w-[70px] text-center">
                    {player?.name ?? "?"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pile count */}
      {pile.length > 0 && (
        <span className="text-xs text-slate-600">
          {pile.length} card{pile.length !== 1 ? "s" : ""} in play
        </span>
      )}
    </div>
  );
}
