// Minimal CSS-rendered playing card.
const SYMBOLS = { hearts:"♥", diamonds:"♦", clubs:"♣", spades:"♠" };
const RED     = new Set(["hearts", "diamonds"]);

export default function Card({ card, faceDown = false, selected = false, disabled = false, onClick, style = {} }) {
  if (!card) return null;

  const red    = RED.has(card.suit);
  const symbol = SYMBOLS[card.suit] ?? "?";
  const color  = red ? "text-rose-500" : "text-slate-100";

  return (
    <div
      id={`card-${card.id}`}
      className={[
        "card-lift relative flex-shrink-0 w-[66px] h-[96px] rounded-xl border",
        "flex flex-col justify-between p-1.5 select-none",
        faceDown
          ? "bg-slate-800 border-slate-700 cursor-default"
          : "bg-white border-slate-200",
        selected  ? "card-selected"  : "",
        disabled  ? "card-disabled"  : faceDown ? "" : "cursor-pointer",
      ].join(" ")}
      style={style}
      onClick={!disabled && !faceDown ? onClick : undefined}
      title={faceDown ? "Hidden" : `${card.value} of ${card.suit}`}
    >
      {faceDown ? (
        /* Card back — simple diagonal stripe */
        <div className="absolute inset-1 rounded-lg bg-gradient-to-br from-blue-800 to-blue-950 opacity-70" />
      ) : (
        <>
          {/* Top-left */}
          <div className={`leading-none ${color}`}>
            <div className="text-[11px] font-black">{card.value}</div>
            <div className="text-[10px]">{symbol}</div>
          </div>
          {/* Center */}
          <div className={`text-2xl text-center leading-none ${color}`}>{symbol}</div>
          {/* Bottom-right (rotated) */}
          <div className={`leading-none rotate-180 ${color}`}>
            <div className="text-[11px] font-black">{card.value}</div>
            <div className="text-[10px]">{symbol}</div>
          </div>
        </>
      )}
    </div>
  );
}
