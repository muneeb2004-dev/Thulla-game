import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext.jsx";
import Card from "../components/Card.jsx";

/* ── Suit helpers ─────────────────────────────────────────────── */
const SYM  = { hearts:"♥", diamonds:"♦", clubs:"♣", spades:"♠" };
const RED  = new Set(["hearts","diamonds"]);
const suitColor = (s) => RED.has(s) ? "text-rose-500" : "text-slate-700";

/* ── Toast (lightweight, inline) ──────────────────────────────── */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add    = useCallback((msg, type = "info", ms = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ms);
  }, []);
  return { toasts, add };
}

const TOAST_CLS = {
  info:    "bg-slate-800 border-slate-600 text-slate-200",
  success: "bg-emerald-900 border-emerald-700 text-emerald-200",
  warning: "bg-amber-900   border-amber-700   text-amber-200",
  error:   "bg-rose-900    border-rose-700    text-rose-200",
};

function ToastStack({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
             className={`toast-enter px-4 py-2.5 rounded-lg border text-sm max-w-xs ${TOAST_CLS[t.type]}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ── Lobby screen ─────────────────────────────────────────────── */
function Lobby({ roomId, players, isHost, onStart, maxPlayers }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-white/8 rounded-2xl p-6 shadow-xl">

        <h2 className="text-xl font-bold text-center mb-1">Waiting for players</h2>
        <p className="text-slate-400 text-sm text-center mb-5">Share the room code with friends</p>

        {/* Room code */}
        <div className="bg-slate-800 rounded-xl p-4 mb-5 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Room Code</p>
          <p className="text-3xl font-black font-mono tracking-[.2em] text-blue-400">{roomId}</p>
          <button
            id="btn-copy-code"
            onClick={copy}
            className="mt-2 text-xs px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 transition"
          >
            {copied ? "✅ Copied!" : "📋 Copy"}
          </button>
        </div>

        {/* Players */}
        <div className="flex flex-col gap-2 mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Players ({players.length}/{maxPlayers})
          </p>
          {players.map(p => (
            <div key={p.id}
                 className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="flex-1 font-medium">{p.name}</span>
              {p.isHost && <span className="text-xs text-amber-400">host</span>}
            </div>
          ))}
          {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) => (
            <div key={i}
                 className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/8 text-sm text-slate-600">
              <span className="w-2 h-2 rounded-full bg-slate-700 flex-shrink-0" />
              Waiting…
            </div>
          ))}
        </div>

        {/* Start / waiting */}
        {isHost ? (
          <button
            id="btn-start-game"
            onClick={onStart}
            disabled={players.length < maxPlayers}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40
                       disabled:cursor-not-allowed text-white font-semibold text-sm transition"
          >
            {players.length < maxPlayers
              ? `Waiting for ${maxPlayers - players.length} more player${maxPlayers - players.length > 1 ? "s" : ""}…`
              : "🚀 Start Game"}
          </button>
        ) : (
          <p className="text-center text-slate-500 text-sm">Waiting for host to start…</p>
        )}
      </div>
    </div>
  );
}

/* ── Player row (sidebar) ────────────────────────────────────── */
function PlayerRow({ player, isCurrentTurn, isSelf, score, isSafe }) {
  return (
    <div className={[
      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition",
      isCurrentTurn
        ? "turn-ring bg-blue-900/40 border border-blue-700 text-white"
        : isSafe
        ? "bg-emerald-900/20 border border-emerald-800/40 text-emerald-400"
        : "bg-slate-800/60 border border-transparent text-slate-300",
    ].join(" ")}>
      {/* Status dot */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
        isSafe ? "bg-emerald-400" : isCurrentTurn ? "bg-blue-400 animate-pulse" : "bg-slate-500"
      }`} />

      {/* Name */}
      <span className="flex-1 font-medium truncate min-w-0">
        {player.name}
        {isSelf && <span className="ml-1 text-[10px] text-slate-500">(you)</span>}
      </span>

      {/* Cards / safe badge */}
      {isSafe
        ? <span className="text-xs text-emerald-400 font-semibold">SAFE</span>
        : <span className="text-xs text-slate-500 tabular-nums">
            {player.cardCount ?? player.hand?.length ?? 0}
            <span className="ml-0.5 text-slate-600">🃏</span>
          </span>
      }
    </div>
  );
}

/* ── Central pile ─────────────────────────────────────────────── */
function Pile({ pile, leadSuit, players }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Lead suit label */}
      {leadSuit && (
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-slate-400">Lead suit:</span>
          <span className={`text-lg font-bold ${suitColor(leadSuit)}`}>{SYM[leadSuit]}</span>
          <span className="text-slate-400 capitalize">{leadSuit}</span>
        </div>
      )}

      {/* Pile area */}
      <div
        className="flex items-center justify-center gap-3 rounded-2xl border border-white/8
                   bg-slate-800/50 min-h-[128px] px-6"
        style={{ minWidth: "280px" }}
      >
        {pile.length === 0
          ? <span className="text-slate-600 text-sm">No cards played yet</span>
          : pile.map(({ playerId, card }, i) => {
              const p = players.find(x => (x.id ?? x) === playerId);
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <Card card={card} disabled />
                  <span className="text-[11px] text-slate-500 max-w-[66px] text-center truncate">
                    {p?.name ?? "?"}
                  </span>
                </div>
              );
            })
        }
      </div>

      {pile.length > 0 && (
        <span className="text-xs text-slate-600">{pile.length} card{pile.length !== 1 ? "s" : ""} in play</span>
      )}
    </div>
  );
}

/* ── Your hand ───────────────────────────────────────────────── */
function Hand({ hand, isMyTurn, leadSuit, onPlay }) {
  const [selected, setSelected] = useState(null);

  function canPlay(card) {
    if (!isMyTurn) return false;
    if (!leadSuit)  return true;
    if (card.suit === leadSuit) return true;
    return !hand.some(c => c.suit === leadSuit); // off-suit ok if no lead suit
  }

  function handleSelect(card) {
    if (!isMyTurn) return;
    setSelected(prev => prev?.id === card.id ? null : card);
  }

  function handlePlay() {
    if (!selected || !isMyTurn) return;
    onPlay(selected);
    setSelected(null);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Status row */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">{hand.length} cards</span>
        {isMyTurn && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold
                           bg-blue-900/60 border border-blue-700 text-blue-300">
            Your turn
          </span>
        )}
        {selected && isMyTurn && (
          <span className="text-slate-400">
            — playing{" "}
            <span className={`font-bold ${suitColor(selected.suit)}`}>
              {selected.value} {SYM[selected.suit]}
            </span>
          </span>
        )}
      </div>

      {/* Cards row slider */}
      <div className="w-full max-w-[calc(100vw-240px)] overflow-x-auto cards-scroll pb-6 pt-4 px-2">
        <div className="flex items-end gap-1.5 min-w-max mx-auto">
          {hand.map((card, i) => {
            const playable  = canPlay(card);
            const isSelected = selected?.id === card.id;
            return (
              <Card
                key={card.id}
                card={card}
                selected={isSelected}
                disabled={!playable}
                onClick={() => handleSelect(card)}
                style={{ zIndex: isSelected ? 20 : i }}
              />
            );
          })}
        </div>
      </div>

      {/* Play button */}
      {selected && isMyTurn && (
        <button
          id="btn-play-card"
          onClick={handlePlay}
          className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white
                     font-semibold text-sm transition shadow-lg"
        >
          Play {selected.value} of {selected.suit}
        </button>
      )}

      {!isMyTurn && (
        <p className="text-slate-600 text-sm">Waiting for other players…</p>
      )}
    </div>
  );
}

/* ── Game over overlay ───────────────────────────────────────── */
function GameOverOverlay({ result, onLeave }) {
  if (!result) return null;
  const { loser, safePlayers = [] } = result;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl text-center">
        <div className="text-5xl mb-3">{loser ? "💀" : "🎉"}</div>
        <h2 className="text-2xl font-bold mb-1">
          {loser ? `${loser.name} gets Thulla!` : "Game Over"}
        </h2>
        {loser && (
          <p className="text-slate-400 text-sm mb-4">
            Stuck with {loser.handCount} card{loser.handCount !== 1 ? "s" : ""}
          </p>
        )}

        {safePlayers.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-5 text-left">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Safe players 🛡️</p>
            {safePlayers.map((p, i) => (
              <div key={p.id}
                   className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-900/30 text-emerald-300 text-sm">
                <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "✓"}</span>
                <span>{p.name}</span>
              </div>
            ))}
            {loser && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-900/30 text-rose-300 text-sm">
                <span>💀</span>
                <span>{loser.name}</span>
                <span className="ml-auto text-xs text-rose-500">LOSER</span>
              </div>
            )}
          </div>
        )}

        <button
          id="btn-leave-game"
          onClick={onLeave}
          className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Game page
══════════════════════════════════════════════════════════════ */
export default function Game() {
  const { roomId }    = useParams();
  const { state }     = useLocation();
  const navigate      = useNavigate();
  const { socket }    = useSocket();
  const { toasts, add } = useToasts();

  const [phase,       setPhase]       = useState("lobby");
  const [players,     setPlayers]     = useState(state?.players ?? []);
  const [isHost,      setIsHost]      = useState(state?.isHost ?? false);
  const [selfId,      setSelfId]      = useState(null);
  const [maxPlayers,  setMaxPlayers]  = useState(state?.maxPlayers ?? 4);

  const [hand,        setHand]        = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [leadSuit,    setLeadSuit]    = useState(null);
  const [pile,        setPile]        = useState([]);
  const [scores,      setScores]      = useState({});
  const [safePlayers, setSafePlayers] = useState(new Set());
  const [gameResult,  setGameResult]  = useState(null);

  /* Apply personalized server view */
  function applyView(v) {
    if (v.currentTurn !== undefined) setCurrentTurn(v.currentTurn);
    if (v.leadSuit    !== undefined) setLeadSuit(v.leadSuit);
    if (v.pile        !== undefined) setPile(v.pile);
    if (v.scores      !== undefined) setScores(v.scores);
    if (v.safePlayers)               setSafePlayers(new Set(v.safePlayers));
    if (v.hand)                      setHand(v.hand);
    if (v.opponents) {
      setPlayers(prev => prev.map(p => {
        const o = v.opponents.find(x => x.id === p.id);
        return o ? { ...p, cardCount: o.cardCount } : p;
      }));
    }
  }

  useEffect(() => { if (socket) setSelfId(socket.id); }, [socket]);

  useEffect(() => {
    if (!socket) return;

    socket.on("playerJoined", ({ players: ps, maxPlayers: mp }) => {
      setPlayers(ps);
      if (mp) setMaxPlayers(mp);
      add(`${ps.at(-1)?.name} joined`, "info");
    });

    socket.on("playerLeft", ({ players: ps }) => {
      setPlayers(ps);
      add("A player left", "warning");
    });

    socket.on("roomFull", ({ maxPlayers: mp }) => {
      if (mp) setMaxPlayers(mp);
      add("Room full — game can start!", "success");
    });

    socket.on("gameStarted", (v) => {
      setPhase("playing");
      applyView(v);
      add("🎮 Game started! Ace of Spades goes first.", "success");
    });

    socket.on("cardPlayed", (v) => applyView(v));

    socket.on("roundEnded", (data) => {
      applyView(data);
      const h = data.highestCard;
      add(
        `🚨 THULLA by ${data.thullaPlayerName}! ${data.penalizedPlayerName} picks up ` +
        `${data.cardsPickedUp} cards${h ? ` (highest: ${h.value}${SYM[h.suit]})` : ""}`,
        "warning", 6000
      );
    });

    socket.on("trickWon", ({ winnerName, winningCard, scores: s }) => {
      setScores(s);
      add(`🏆 ${winnerName} wins the trick with ${winningCard.value}${SYM[winningCard.suit]}`, "info", 3000);
    });

    socket.on("playerSafe", ({ playerId: pid, playerName }) => {
      setSafePlayers(p => new Set([...p, pid]));
      add(pid === socket.id ? "🛡️ You're SAFE!" : `🛡️ ${playerName} is safe!`, "success", 5000);
    });

    socket.on("gameEnded", (result) => {
      setPhase("finished");
      setGameResult(result);
      add(
        result.loser?.id === socket.id
          ? "💀 You got Thulla!"
          : `💀 ${result.loser?.name} is the Thulla loser!`,
        result.loser?.id === socket.id ? "error" : "info", 6000
      );
    });

    socket.on("invalidMove", ({ message }) => add(message, "error"));
    socket.on("error", ({ message }) => add(message, "error"));

    return () => {
      ["playerJoined","playerLeft","roomFull","gameStarted","cardPlayed",
       "roundEnded","trickWon","playerSafe","gameEnded","invalidMove","error"]
        .forEach(ev => socket.off(ev));
    };
  }, [socket]);

  const handlePlayCard = useCallback((card) => {
    socket.emit("playCard", { roomId, card });
  }, [socket, roomId]);

  function handleStart() { socket.emit("startGame", { roomId }); }

  /* Derived */
  const self      = players.find(p => p.id === selfId);
  const opponents = players.filter(p => p.id !== selfId);
  const isMyTurn  = currentTurn === selfId && !safePlayers.has(selfId);

  /* ── Lobby phase ───────────────────────────────────────────── */
  if (phase === "lobby") {
    return (
      <>
        <Lobby roomId={roomId} players={players} isHost={isHost} onStart={handleStart} maxPlayers={maxPlayers} />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  /* ── Playing / Finished phase ──────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* ── Top bar ──────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3
                         bg-slate-900 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🃏</span>
          <div>
            <h1 className="text-base font-bold leading-none">Card Blitz</h1>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{roomId}</p>
          </div>
        </div>

        {/* Current turn banner */}
        <div className={`text-sm px-3 py-1 rounded-full border transition
          ${isMyTurn
            ? "bg-blue-900/50 border-blue-700 text-blue-300"
            : "bg-slate-800 border-slate-700 text-slate-400"}`}
        >
          {isMyTurn
            ? "⚡ Your turn"
            : `${players.find(p => p.id === currentTurn)?.name ?? "…"}'s turn`}
        </div>

        <button
          id="btn-leave"
          onClick={() => navigate("/")}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700
                     text-slate-400 hover:text-slate-200 transition"
        >
          Leave
        </button>
      </header>

      {/* ── Main layout ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — players */}
        <aside className="w-48 flex-shrink-0 border-r border-white/8 bg-slate-900/50 p-3 flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Players
            </p>
            <div className="flex flex-col gap-1.5">
              {players.map(p => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  isCurrentTurn={currentTurn === p.id}
                  isSelf={p.id === selfId}
                  score={scores[p.id] ?? 0}
                  isSafe={safePlayers.has(p.id)}
                />
              ))}
            </div>
          </div>

          {/* Scores */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Tricks Won
            </p>
            {players.map(p => (
              <div key={p.id}
                   className="flex items-center justify-between text-xs py-0.5">
                <span className="text-slate-400 truncate">{p.name}</span>
                <span className="font-bold text-emerald-400 tabular-nums">{scores[p.id] ?? 0}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Center — pile + your hand */}
        <main className="flex-1 flex flex-col items-center justify-between p-6 overflow-auto">

          {/* ── Pile (center) ───────────────────────────────── */}
          <div className="flex-1 flex items-center justify-center">
            <Pile pile={pile} leadSuit={leadSuit} players={players} />
          </div>

          {/* ── Divider ─────────────────────────────────────── */}
          <div className="w-full max-w-lg border-t border-white/8 my-4" />

          {/* ── Your hand ───────────────────────────────────── */}
          <div className="w-full flex flex-col items-center">
            {self && (
              <p className="text-xs text-slate-500 mb-3 text-center">
                Your hand
                {safePlayers.has(selfId) && (
                  <span className="ml-2 text-emerald-400 font-semibold">· You're safe! 🛡️</span>
                )}
              </p>
            )}
            <Hand
              hand={hand}
              isMyTurn={isMyTurn}
              leadSuit={leadSuit}
              onPlay={handlePlayCard}
            />
          </div>
        </main>
      </div>

      {/* Game over overlay */}
      {phase === "finished" && (
        <GameOverOverlay result={gameResult} onLeave={() => navigate("/")} />
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}
