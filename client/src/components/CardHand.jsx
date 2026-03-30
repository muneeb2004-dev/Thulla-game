// Fan-spread hand of cards for the current player.
// Cards fan out on hover and can be selected/played.
import { useState } from "react";
import Card from "./Card.jsx";

export default function CardHand({ hand = [], isMyTurn, leadSuit, onPlayCard }) {
  const [selected, setSelected] = useState(null);

  function handleSelect(card) {
    if (!isMyTurn) return;
    setSelected((prev) => (prev?.id === card.id ? null : card));
  }

  function handlePlay() {
    if (!selected || !isMyTurn) return;
    onPlayCard(selected);
    setSelected(null);
  }

  // Determine which cards are legally playable
  function isPlayable(card) {
    if (!isMyTurn) return false;
    if (!leadSuit) return true; // first card of trick — anything goes
    if (card.suit === leadSuit) return true;
    // Off-suit only allowed if player has NO card of lead suit
    return !hand.some((c) => c.suit === leadSuit);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hand label */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm font-medium">Your Hand</span>
        <span className="badge badge-blue">{hand.length} cards</span>
        {isMyTurn && (
          <span className="badge badge-green animate-pulse-glow">Your Turn!</span>
        )}
      </div>

      {/* Cards */}
      <div className="flex items-end justify-center" style={{ gap: "-8px" }}>
        {hand.map((card, i) => {
          const playable = isPlayable(card);
          const isSelected = selected?.id === card.id;
          return (
            <Card
              key={card.id}
              card={card}
              selected={isSelected}
              disabled={!playable}
              onClick={() => handleSelect(card)}
              style={{
                marginLeft: i === 0 ? 0 : "-12px",
                zIndex: isSelected ? 20 : i,
                transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
              }}
            />
          );
        })}
      </div>

      {/* Play button */}
      {selected && isMyTurn && (
        <button
          id="btn-play-card"
          className="btn btn-success animate-pop-in"
          onClick={handlePlay}
        >
          ▶ Play {selected.value} of {selected.suit}
        </button>
      )}

      {!isMyTurn && (
        <p className="text-slate-500 text-sm italic">Waiting for other player…</p>
      )}
    </div>
  );
}
