import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext.jsx";
import Card from "../components/Card.jsx";

/* ── Suit helpers ─────────────────────────────────────────────── */
const SYM  = { hearts:"♥", diamonds:"♦", clubs:"♣", spades:"♠" };
const RED  = new Set(["hearts","diamonds"]);
const suitColor = s => RED.has(s) ? "text-red-400" : "text-gray-300";

/* ── Card sorting ─────────────────────────────────────────────── */
const SUIT_ORDER  = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
const VALUE_RANK  = { "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14 };

function sortHand(hand) {
  return [...hand].sort((a, b) =>
    SUIT_ORDER[a.suit] !== SUIT_ORDER[b.suit]
      ? SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]
      : VALUE_RANK[a.value] - VALUE_RANK[b.value]
  );
}

/* ── Toasts ───────────────────────────────────────────────────── */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info", ms = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ms);
  }, []);
  return { toasts, add };
}

const TOAST_CLS = {
  info:    "bg-[#1a1a1a] border-white/15 text-gray-200",
  success: "bg-emerald-950/90 border-emerald-800/60 text-emerald-200",
  warning: "bg-[#2a1500]/90 border-amber-800/60 text-amber-200",
  error:   "bg-red-950/90 border-red-800/60 text-red-200",
};

function ToastStack({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
             className={`toast-enter px-4 py-2.5 rounded-xl border backdrop-blur-sm
                         text-sm max-w-xs shadow-lg ${TOAST_CLS[t.type]}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ── Lobby ────────────────────────────────────────────────────── */
function Lobby({ roomId, players, isHost, onStart, maxPlayers }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6
                        shadow-2xl shadow-black">

          <h2 className="text-xl font-bold text-center mb-0.5">Waiting for players</h2>
          <p className="text-gray-600 text-xs text-center mb-5">
            Share the room code with your friends
          </p>

          {/* Room code */}
          <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-5 text-center">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Room Code</p>
            <p className="text-3xl font-black font-mono tracking-[.2em] text-white">
              {roomId}
            </p>
            <button
              id="btn-copy-code"
              onClick={copy}
              className="mt-2.5 text-xs px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10
                         text-gray-500 hover:text-gray-200 border border-white/8 transition"
            >
              {copied ? "✅ Copied!" : "📋 Copy"}
            </button>
          </div>

          {/* Players */}
          <div className="flex flex-col gap-1.5 mb-5">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
              Players ({players.length}/{maxPlayers})
            </p>
            {players.map(p => (
              <div key={p.id}
                   className="flex items-center gap-2 px-3 py-2 rounded-lg
                              bg-white/4 border border-white/5 text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isDisconnected ? "bg-yellow-500" : "bg-emerald-400"}`} />
                <span className="flex-1 font-medium">{p.name}</span>
                {p.isDisconnected && (
                  <span className="text-[10px] text-yellow-500">reconnecting…</span>
                )}
                {p.isHost && !p.isDisconnected && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md
                                   bg-yellow-950/50 text-yellow-500 border border-yellow-900/40">
                    host
                  </span>
                )}
              </div>
            ))}
            {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) => (
              <div key={i}
                   className="flex items-center gap-2 px-3 py-2 rounded-lg
                              border border-dashed border-white/6 text-sm text-gray-700">
                <span className="w-2 h-2 rounded-full bg-gray-800 flex-shrink-0" />
                Waiting…
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              id="btn-start-game"
              onClick={onStart}
              disabled={players.length < maxPlayers}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
                         disabled:opacity-40 disabled:cursor-not-allowed
                         text-white font-bold text-sm transition-all hover:-translate-y-px
                         shadow-md shadow-blue-950/60"
            >
              {players.length < maxPlayers
                ? `Waiting for ${maxPlayers - players.length} more player${maxPlayers - players.length > 1 ? "s" : ""}…`
                : "🚀 Start Game"}
            </button>
          ) : (
            <p className="text-center text-gray-700 text-sm py-1">
              Waiting for the host to start…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Player row ───────────────────────────────────────────────── */
function PlayerRow({ player, isCurrentTurn, isSelf, score, isSafe }) {
  return (
    <div className={[
      "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all",
      isCurrentTurn
        ? "turn-ring bg-blue-950/50 border border-blue-700/60 text-white"
        : isSafe
        ? "bg-emerald-950/30 border border-emerald-900/40 text-emerald-400"
        : player.isDisconnected
        ? "bg-yellow-950/20 border border-yellow-900/30 text-yellow-600"
        : "bg-white/3 border border-white/5 text-gray-500",
    ].join(" ")}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
        isSafe ? "bg-emerald-400" : isCurrentTurn ? "bg-blue-400 animate-pulse" : player.isDisconnected ? "bg-yellow-500 animate-pulse" : "bg-gray-700"
      }`} />
      <span className="flex-1 font-medium truncate min-w-0">
        {player.name}
        {isSelf && <span className="ml-1 text-[10px] text-gray-700">(you)</span>}
      </span>
      {isSafe
        ? <span className="text-[10px] font-bold text-emerald-400 tracking-wide">SAFE</span>
        : player.isDisconnected
        ? <span className="text-[10px] text-yellow-600">⚠</span>
        : <span className="text-[11px] text-gray-700 tabular-nums">
            {player.cardCount ?? player.hand?.length ?? 0}
            <span className="ml-0.5">🃏</span>
          </span>
      }
    </div>
  );
}

/* ── Pile ─────────────────────────────────────────────────────── */
function Pile({ pile, leadSuit, players, dropZoneRef, isDragOver }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {leadSuit && (
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-gray-600">Lead suit:</span>
          <span className={`text-xl font-bold ${suitColor(leadSuit)}`}>{SYM[leadSuit]}</span>
          <span className="text-gray-600 capitalize">{leadSuit}</span>
        </div>
      )}
      <div
        ref={dropZoneRef}
        className={`flex items-center justify-center gap-3 rounded-2xl px-6
                    min-h-[140px] border transition-all duration-200
                    ${isDragOver
                      ? "border-blue-500 bg-blue-950/30 scale-[1.02]"
                      : pile.length > 0
                      ? "border-white/10 bg-white/4"
                      : "border-dashed border-white/6 bg-white/2"}`}
        style={{ minWidth: "280px" }}
      >
        {pile.length === 0
          ? <span className="text-gray-700 text-sm">
              {isDragOver ? "Drop card here" : "No cards played yet"}
            </span>
          : pile.map(({ playerId, card }, i) => {
              const p = players.find(x => (x.id ?? x) === playerId);
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <Card card={card} disabled />
                  <span className="text-[11px] text-gray-600 max-w-[66px] text-center truncate">
                    {p?.name ?? "?"}
                  </span>
                </div>
              );
            })
        }
      </div>
      {pile.length > 0 && !isDragOver && (
        <span className="text-xs text-gray-700">
          {pile.length} card{pile.length !== 1 ? "s" : ""} in play
        </span>
      )}
      {isDragOver && (
        <span className="text-xs text-blue-400 font-medium">Release to play</span>
      )}
    </div>
  );
}

/* ── Hand ─────────────────────────────────────────────────────── */
function Hand({ hand, isMyTurn, leadSuit, onPlay, onDragStart, draggingCard }) {
  const [selected, setSelected] = useState(null);

  // Sort hand: spades → hearts → diamonds → clubs, then by rank within suit
  const sortedHand = useMemo(() => sortHand(hand), [hand]);

  function canPlay(card) {
    if (!isMyTurn) return false;
    if (!leadSuit) return true;
    if (card.suit === leadSuit) return true;
    return !hand.some(c => c.suit === leadSuit);
  }

  function handlePlay() {
    if (!selected || !isMyTurn) return;
    onPlay(selected);
    setSelected(null);
  }

  // Clear selection when it's no longer our turn
  useEffect(() => {
    if (!isMyTurn) setSelected(null);
  }, [isMyTurn]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">{hand.length} cards</span>
        {isMyTurn && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold
                           bg-blue-950/60 border border-blue-800/60 text-blue-300">
            ⚡ Your turn
          </span>
        )}
        {selected && isMyTurn && (
          <span className="text-gray-600">
            — <span className={`font-bold ${suitColor(selected.suit)}`}>
              {selected.value} {SYM[selected.suit]}
            </span>
          </span>
        )}
      </div>

      <div className="w-full max-w-[calc(100vw-16px)] md:max-w-[calc(100vw-240px)]
                      overflow-x-auto cards-scroll pb-6 pt-4 px-2">
        <div className="flex items-end gap-1.5 min-w-max mx-auto">
          {sortedHand.map((card, i) => {
            const playable   = canPlay(card);
            const isSelected = selected?.id === card.id;
            const isBeingDragged = draggingCard?.id === card.id;
            return (
              <div
                key={card.id}
                style={{ zIndex: isSelected ? 20 : i, opacity: isBeingDragged ? 0.35 : 1 }}
                onMouseDown={(e) => {
                  if (!isMyTurn || !playable) return;
                  e.preventDefault();
                  onDragStart(card, e, (c) =>
                    setSelected(prev => prev?.id === c.id ? null : c)
                  );
                }}
                onTouchStart={(e) => {
                  if (!isMyTurn || !playable) return;
                  onDragStart(card, e, (c) =>
                    setSelected(prev => prev?.id === c.id ? null : c)
                  );
                }}
              >
                <Card
                  card={card}
                  selected={isSelected}
                  disabled={!playable}
                />
              </div>
            );
          })}
        </div>
      </div>

      {selected && isMyTurn && (
        <button
          id="btn-play-card"
          onClick={handlePlay}
          className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500
                     text-white font-bold text-sm transition-all
                     shadow-lg shadow-blue-950/60 hover:-translate-y-px"
        >
          Play {selected.value} of {selected.suit}
        </button>
      )}

      {!isMyTurn && (
        <p className="text-gray-700 text-sm">Waiting for other players…</p>
      )}
    </div>
  );
}

/* ── Game over overlay ────────────────────────────────────────── */
function GameOverOverlay({ result, onLeave }) {
  if (!result) return null;
  const { loser, safePlayers = [] } = result;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm
                    flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0f0f0f] border border-white/10
                      rounded-2xl p-6 shadow-2xl text-center">
        <div className="text-5xl mb-3">{loser ? "💀" : "🎉"}</div>
        <h2 className="text-2xl font-black mb-1 text-white">
          {loser ? `${loser.name} gets Thulla!` : "Game Over"}
        </h2>
        {loser && (
          <p className="text-gray-600 text-sm mb-4">
            Stuck with {loser.handCount} card{loser.handCount !== 1 ? "s" : ""}
          </p>
        )}

        {safePlayers.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-5 text-left">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
              Safe players 🛡️
            </p>
            {safePlayers.map((p, i) => (
              <div key={p.id}
                   className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                              bg-emerald-950/40 text-emerald-300 text-sm
                              border border-emerald-900/30">
                <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "✓"}</span>
                <span>{p.name}</span>
              </div>
            ))}
            {loser && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                              bg-red-950/40 text-red-300 text-sm border border-red-900/30">
                <span>💀</span>
                <span>{loser.name}</span>
                <span className="ml-auto text-[10px] text-red-500 font-bold">THULLA</span>
              </div>
            )}
          </div>
        )}

        <button
          id="btn-leave-game"
          onClick={onLeave}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
                     text-white font-bold text-sm transition-all hover:-translate-y-px
                     shadow-md shadow-blue-950/60"
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
  const { roomId }      = useParams();
  const { state }       = useLocation();
  const navigate        = useNavigate();
  const { socket }      = useSocket();
  const { toasts, add } = useToasts();

  // ── Core game state ──────────────────────────────────────────
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

  // ── Drag state (lifted so drop zone can access) ──────────────
  const [dragInfo,   setDragInfo]   = useState(null); // {card, startX, startY, x, y, isDragging, onTap}
  const [isDragOver, setIsDragOver] = useState(false);
  const dropZoneRef = useRef(null);

  // ── Pending round-end ref (for delaying thulla applyView) ────
  const pendingRoundEndRef = useRef(null);

  // ── Apply game view from server ──────────────────────────────
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

  // ── Drag & drop — pointer-based (works on mobile + desktop) ──
  const handleDragStart = useCallback((card, e, onTap) => {
    const src = e.touches ? e.touches[0] : e;
    setDragInfo({
      card,
      startX: src.clientX, startY: src.clientY,
      x: src.clientX,      y: src.clientY,
      isDragging: false,
      onTap,
    });
  }, []);

  useEffect(() => {
    if (!dragInfo) return;

    function onMove(e) {
      const src = e.touches ? e.touches[0] : e;
      setDragInfo(d => {
        if (!d) return null;
        const moved = d.isDragging || Math.hypot(src.clientX - d.startX, src.clientY - d.startY) > 10;
        if (moved !== d.isDragging || src.clientX !== d.x || src.clientY !== d.y) {
          return { ...d, x: src.clientX, y: src.clientY, isDragging: moved };
        }
        return d;
      });
      // Update drag-over state
      if (dropZoneRef.current) {
        const r = dropZoneRef.current.getBoundingClientRect();
        const over = src.clientX >= r.left && src.clientX <= r.right
                  && src.clientY >= r.top  && src.clientY <= r.bottom;
        setIsDragOver(over);
      }
    }

    function onUp(e) {
      const src = e.changedTouches ? e.changedTouches[0] : e;
      setIsDragOver(false);
      setDragInfo(d => {
        if (!d) return null;
        if (d.isDragging) {
          // Check drop zone
          if (dropZoneRef.current) {
            const r = dropZoneRef.current.getBoundingClientRect();
            if (src.clientX >= r.left && src.clientX <= r.right
             && src.clientY >= r.top  && src.clientY <= r.bottom) {
              // Play the card
              socket?.emit("playCard", { roomId, card: d.card });
            }
          }
        } else if (d.onTap) {
          // Short press = tap = select card
          d.onTap(d.card);
        }
        return null;
      });
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchend",  onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchend",  onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!dragInfo, socket, roomId]);

  // ── Track selfId; attempt rejoin on reconnect ────────────────
  useEffect(() => {
    if (!socket) return;

    function onConnect() {
      setSelfId(socket.id);
      // If we have a saved session for this room, attempt to rejoin
      const session = JSON.parse(localStorage.getItem("cardblitz_session") || "null");
      if (session?.roomId === roomId && session?.playerName) {
        socket.emit("rejoinRoom", { roomId: session.roomId, playerName: session.playerName });
      }
    }

    // Set immediately on mount (socket may already be connected)
    if (socket.id) setSelfId(socket.id);
    socket.on("connect", onConnect);
    return () => socket.off("connect", onConnect);
  }, [socket, roomId]);

  // ── Reconnect when app comes back to foreground ──────────────
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible" && socket && !socket.connected) {
        socket.connect();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [socket]);

  // ── Socket event listeners ───────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on("playerJoined", ({ players: ps, maxPlayers: mp }) => {
      setPlayers(ps);
      if (mp) setMaxPlayers(mp);
      add(`${ps.at(-1)?.name} joined`, "info");
    });

    socket.on("playerLeft", ({ players: ps, isTemporary }) => {
      if (ps) setPlayers(ps);
      add(isTemporary ? "A player disconnected (reconnect window open)" : "A player left", "warning");
    });

    socket.on("playerRejoined", ({ playerName, players: ps }) => {
      if (ps) setPlayers(ps);
      add(`${playerName} reconnected!`, "success");
    });

    socket.on("roomFull", ({ maxPlayers: mp }) => {
      if (mp) setMaxPlayers(mp);
      add("Room full — game can start!", "success");
    });

    socket.on("gameStarted", v => {
      setPhase("playing");
      applyView(v);
      add("🎮 Game started! Ace of Spades goes first.", "success");
    });

    socket.on("cardPlayed", v => {
      // Cancel any pending roundEnded applyView (thulla pile stays visible)
      if (pendingRoundEndRef.current) {
        clearTimeout(pendingRoundEndRef.current);
        pendingRoundEndRef.current = null;
      }
      applyView(v);
    });

    socket.on("roundEnded", data => {
      const h = data.highestCard;
      add(
        `🚨 THULLA by ${data.thullaPlayerName}! ${data.penalizedPlayerName} picks up ` +
        `${data.cardsPickedUp} cards${h ? ` (highest: ${h.value}${SYM[h.suit]})` : ""}`,
        "warning", 6000,
      );
      // Delay clearing the pile so players can see all the thulla cards for ~1.8s
      pendingRoundEndRef.current = setTimeout(() => {
        pendingRoundEndRef.current = null;
        applyView(data);
      }, 1800);
    });

    // trickWon: update state but intentionally do NOT update pile —
    // the completed pile stays visible from cardPlayed until the next card is played
    socket.on("trickWon", (data) => {
      if (data.scores)      setScores(data.scores);
      if (data.currentTurn !== undefined) setCurrentTurn(data.currentTurn);
      if (data.safePlayers) setSafePlayers(new Set(data.safePlayers));
      if (data.hand)        setHand(data.hand);
      if (data.opponents) {
        setPlayers(prev => prev.map(p => {
          const o = data.opponents?.find(x => x.id === p.id);
          return o ? { ...p, cardCount: o.cardCount } : p;
        }));
      }
      add(`🏆 ${data.winnerName} wins the trick with ${data.winningCard.value}${SYM[data.winningCard.suit]}`, "info", 3000);
    });

    socket.on("playerSafe", ({ playerId: pid, playerName }) => {
      setSafePlayers(p => new Set([...p, pid]));
      add(pid === socket.id ? "🛡️ You're SAFE!" : `🛡️ ${playerName} is safe!`, "success", 5000);
    });

    socket.on("gameEnded", result => {
      // Cancel pending thulla pile delay
      if (pendingRoundEndRef.current) {
        clearTimeout(pendingRoundEndRef.current);
        pendingRoundEndRef.current = null;
      }
      setPhase("finished");
      setGameResult(result);
      add(
        result.loser?.id === socket.id ? "💀 You got Thulla!" : `💀 ${result.loser?.name} is the Thulla loser!`,
        result.loser?.id === socket.id ? "error" : "info", 6000,
      );
      localStorage.removeItem("cardblitz_session");
    });

    socket.on("gameRejoined", ({ players: ps, maxPlayers: mp, phase: p, gameView }) => {
      setSelfId(socket.id);
      if (ps)      setPlayers(ps);
      if (mp)      setMaxPlayers(mp);
      if (p)       setPhase(p);
      if (gameView) applyView(gameView);
      // Restore isHost
      const self = ps?.find(pl => pl.id === socket.id);
      if (self?.isHost) setIsHost(true);
      add("✅ Reconnected to game!", "success");
    });

    socket.on("rejoinError", ({ message }) => {
      localStorage.removeItem("cardblitz_session");
      add(message || "Could not rejoin game", "error");
      setTimeout(() => navigate("/"), 2000);
    });

    socket.on("invalidMove", ({ message }) => add(message, "error"));
    socket.on("error",       ({ message }) => add(message, "error"));

    return () => {
      ["playerJoined","playerLeft","playerRejoined","roomFull","gameStarted","cardPlayed",
       "roundEnded","trickWon","playerSafe","gameEnded","gameRejoined","rejoinError",
       "invalidMove","error"]
        .forEach(ev => socket.off(ev));
    };
  }, [socket]);

  const handlePlayCard = useCallback(card => {
    socket.emit("playCard", { roomId, card });
  }, [socket, roomId]);

  function handleStart() { socket.emit("startGame", { roomId }); }

  function handleLeave() {
    localStorage.removeItem("cardblitz_session");
    navigate("/");
  }

  const self     = players.find(p => p.id === selfId);
  const isMyTurn = currentTurn === selfId && !safePlayers.has(selfId);

  if (phase === "lobby") {
    return (
      <>
        <Lobby roomId={roomId} players={players} isHost={isHost} onStart={handleStart} maxPlayers={maxPlayers} />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col select-none">

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-2
                         px-3 sm:px-4 py-3 flex-shrink-0
                         bg-[#0a0a0a] border-b border-white/8">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-lg sm:text-xl">🃏</span>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold leading-none text-white">Card Blitz</h1>
            <p className="text-[10px] text-gray-700 font-mono mt-0.5">{roomId}</p>
          </div>
        </div>

        <div className={`text-xs sm:text-sm px-3 py-1 rounded-full border transition
                         max-w-[150px] sm:max-w-none truncate text-center ${
          isMyTurn
            ? "bg-blue-950/60 border-blue-800/60 text-blue-300"
            : "bg-white/4 border-white/8 text-gray-500"
        }`}>
          {isMyTurn
            ? "⚡ Your turn"
            : `${players.find(p => p.id === currentTurn)?.name ?? "…"}'s turn`}
        </div>

        <button
          id="btn-leave"
          onClick={handleLeave}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/4 hover:bg-white/8
                     border border-white/8 text-gray-600 hover:text-gray-300
                     transition whitespace-nowrap"
        >
          Leave
        </button>
      </header>

      {/* Layout */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-full md:w-52 flex-shrink-0
                          border-b md:border-b-0 md:border-r border-white/8
                          bg-[#0a0a0a] p-3
                          flex flex-row md:flex-col gap-4
                          overflow-x-auto md:overflow-y-auto hidden-scrollbar">
          <div className="flex-1 min-w-max">
            <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider
                           mb-2 hidden md:block">Players</p>
            <div className="flex flex-row md:flex-col gap-1.5 pb-1 md:pb-0">
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
          <div className="hidden md:block">
            <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Tricks Won
            </p>
            {players.map(p => (
              <div key={p.id} className="flex items-center justify-between text-xs py-0.5">
                <span className="text-gray-600 truncate">{p.name}</span>
                <span className="font-bold text-emerald-400 tabular-nums">{scores[p.id] ?? 0}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Center */}
        <main className="flex-1 flex flex-col items-center justify-between
                         p-2 pt-4 md:p-6 overflow-hidden md:overflow-auto">
          <div className="flex-1 flex items-center justify-center w-full">
            <Pile
              pile={pile}
              leadSuit={leadSuit}
              players={players}
              dropZoneRef={dropZoneRef}
              isDragOver={isDragOver && isMyTurn}
            />
          </div>
          <div className="w-full max-w-lg border-t border-white/8 my-4" />
          <div className="w-full flex flex-col items-center">
            {self && (
              <p className="text-xs text-gray-700 mb-3 text-center">
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
              onDragStart={handleDragStart}
              draggingCard={dragInfo?.card}
            />
          </div>
        </main>
      </div>

      {/* Floating ghost card while dragging */}
      {dragInfo?.isDragging && createPortal(
        <div
          className="fixed pointer-events-none z-[9999] opacity-90 rotate-3"
          style={{
            left: dragInfo.x - 33,
            top:  dragInfo.y - 48,
            transform: "scale(1.08) rotate(3deg)",
            transition: "none",
            filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))",
          }}
        >
          <Card card={dragInfo.card} />
        </div>,
        document.body
      )}

      {phase === "finished" && (
        <GameOverOverlay result={gameResult} onLeave={handleLeave} />
      )}
      <ToastStack toasts={toasts} />
    </div>
  );
}
