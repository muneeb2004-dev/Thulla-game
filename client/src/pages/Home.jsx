import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext.jsx";
import DottedSurface from "../components/DottedSurface.jsx";

export default function Home() {
  const { socket, connected } = useSocket();
  const navigate = useNavigate();

  const [name,       setName]       = useState("");
  const [roomCode,   setRoomCode]   = useState("");
  const [tab,        setTab]        = useState("create");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);

  useEffect(() => {
    if (!socket) return;

    socket.on("roomCreated", ({ roomId, players, maxPlayers: mp }) => {
      setLoading(false);
      localStorage.setItem("cardblitz_session", JSON.stringify({ roomId, playerName: name.trim() }));
      navigate(`/game/${roomId}`, { state: { playerName: name, players, isHost: true, maxPlayers: mp } });
    });

    socket.on("playerJoined", ({ roomId, players, maxPlayers: mp }) => {
      setLoading(false);
      localStorage.setItem("cardblitz_session", JSON.stringify({ roomId, playerName: name.trim() }));
      navigate(`/game/${roomId}`, { state: { playerName: name, players, isHost: false, maxPlayers: mp } });
    });

    socket.on("error", ({ message }) => {
      setLoading(false);
      setError(message);
    });

    return () => {
      socket.off("roomCreated");
      socket.off("playerJoined");
      socket.off("error");
    };
  }, [socket, navigate, name]);

  function validate() {
    if (!name.trim())                        { setError("Enter your name.");   return false; }
    if (!connected)                          { setError("Server offline.");    return false; }
    if (tab === "join" && !roomCode.trim())  { setError("Enter a room code."); return false; }
    setError("");
    return true;
  }

  function handleCreate() {
    if (!validate()) return;
    setLoading(true);
    socket.emit("createRoom", { playerName: name.trim(), maxPlayers });
  }

  function handleJoin() {
    if (!validate()) return;
    setLoading(true);
    socket.emit("joinRoom", { roomId: roomCode.trim().toUpperCase(), playerName: name.trim() });
  }

  const inputCls = `w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10
    text-white placeholder:text-gray-700 focus:outline-none focus:border-blue-500
    focus:ring-1 focus:ring-blue-500/40 transition text-sm`;

  return (
    <div className="min-h-screen text-white flex items-center justify-center p-4">
      <DottedSurface opacity={0.5} />

      {/* Back link */}
      <Link
        to="/"
        className="fixed top-5 left-5 z-20 flex items-center gap-1.5
                   text-xs text-gray-600 hover:text-gray-300 transition"
      >
        ← Back
      </Link>

      {/* Form card */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-7">
          <span className="text-5xl select-none">🃏</span>
          <h1 className="mt-3 text-3xl font-black tracking-tight
                         bg-gradient-to-b from-white to-gray-400
                         bg-clip-text text-transparent">
            Card Blitz
          </h1>
          <p className="mt-1 text-xs text-gray-600 tracking-wide">
            Multiplayer trick-taking · Thulla rules
          </p>

          {/* Connection pill */}
          <span className={`inline-flex items-center gap-1.5 mt-3 text-xs
                            px-2.5 py-1 rounded-full border ${connected
            ? "bg-emerald-950/60 border-emerald-900 text-emerald-400"
            : "bg-red-950/60 border-red-900 text-red-400"}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${connected
              ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            {connected ? "Server connected" : "Offline — start the server"}
          </span>
        </div>

        {/* Glass card */}
        <div className="bg-[#0f0f0f]/90 backdrop-blur-sm border border-white/10
                        rounded-2xl p-6 shadow-2xl shadow-black">

          {/* Name */}
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-gray-600
                               uppercase tracking-wider mb-1.5">
              Your Name
            </label>
            <input
              id="input-player-name"
              className={inputCls}
              placeholder="e.g. Alice"
              maxLength={20}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (tab === "create" ? handleCreate() : handleJoin())}
            />
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-white/8 mb-5">
            {["create", "join"].map(t => (
              <button
                key={t}
                id={`tab-${t}`}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2 text-sm font-semibold transition ${
                  tab === t
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:text-white hover:bg-white/5"
                }`}
              >
                {t === "create" ? "Create Room" : "Join Room"}
              </button>
            ))}
          </div>

          {/* Tab body */}
          {tab === "create" ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600
                                   uppercase tracking-wider mb-1.5">
                  Room Size
                </label>
                <select
                  className={`${inputCls} appearance-none cursor-pointer`}
                  value={maxPlayers}
                  onChange={e => setMaxPlayers(Number(e.target.value))}
                >
                  <option value={6} className="bg-[#111]">6 Players</option>
                  <option value={5} className="bg-[#111]">5 Players</option>
                  <option value={4} className="bg-[#111]">4 Players</option>
                  <option value={3} className="bg-[#111]">3 Players</option>
                  <option value={2} className="bg-[#111]">2 Players</option>
                </select>
              </div>
              <button
                id="btn-create-room"
                onClick={handleCreate}
                disabled={loading || !connected}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
                           disabled:opacity-40 disabled:cursor-not-allowed
                           text-white font-bold text-sm transition-all
                           shadow-md shadow-blue-950/60 hover:-translate-y-px"
              >
                {loading ? "Creating…" : "✨ Create Game"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <input
                id="input-room-code"
                className={`${inputCls} text-center uppercase tracking-[.2em]
                             font-mono font-bold text-base`}
                placeholder="XXXXXX"
                maxLength={6}
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleJoin()}
              />
              <button
                id="btn-join-room"
                onClick={handleJoin}
                disabled={loading || !connected}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500
                           disabled:opacity-40 disabled:cursor-not-allowed
                           text-white font-bold text-sm transition-all
                           shadow-md shadow-emerald-950/60 hover:-translate-y-px"
              >
                {loading ? "Joining…" : "🚀 Join Game"}
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 text-xs text-center text-red-400">{error}</p>
          )}
        </div>

        <p className="text-center text-gray-800 text-xs mt-4">
          Ace of Spades ♠ goes first · Follow suit or Thulla!
        </p>
      </div>
    </div>
  );
}
