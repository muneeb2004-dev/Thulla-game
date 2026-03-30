import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext.jsx";

export default function Home() {
  const { socket, connected } = useSocket();
  const navigate = useNavigate();

  const [name,       setName]       = useState("");
  const [roomCode,   setRoomCode]   = useState("");
  const [tab,        setTab]        = useState("create"); // "create" | "join"
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4); // Default to 4

  useEffect(() => {
    if (!socket) return;

    socket.on("roomCreated", ({ roomId, players, maxPlayers }) => {
      setLoading(false);
      navigate(`/game/${roomId}`, { state: { playerName: name, players, isHost: true, maxPlayers } });
    });

    socket.on("playerJoined", ({ roomId, players, maxPlayers }) => {
      setLoading(false);
      navigate(`/game/${roomId}`, { state: { playerName: name, players, isHost: false, maxPlayers } });
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
    if (!name.trim())            { setError("Enter your name.");       return false; }
    if (!connected)              { setError("Server offline.");        return false; }
    if (tab === "join" && !roomCode.trim()) { setError("Enter a room code."); return false; }
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

  const input = "w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl">🃏</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Card Blitz</h1>
          <p className="mt-1 text-sm text-slate-400">Multiplayer trick-taking game · 4 players</p>

          {/* Connection pill */}
          <span className={`inline-flex items-center gap-1.5 mt-3 text-xs px-2.5 py-1 rounded-full border
            ${connected
              ? "bg-emerald-950 border-emerald-800 text-emerald-400"
              : "bg-rose-950 border-rose-800 text-rose-400"}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
            {connected ? "Connected" : "Offline — start the server"}
          </span>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-white/8 rounded-2xl p-6 shadow-xl">

          {/* Name */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Your Name
            </label>
            <input
              id="input-player-name"
              className={input}
              placeholder="e.g. Alice"
              maxLength={20}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (tab === "create" ? handleCreate() : handleJoin())}
            />
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-white/8 mb-4">
            {["create","join"].map(t => (
              <button
                key={t}
                id={`tab-${t}`}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium transition
                  ${tab === t
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              >
                {t === "create" ? "Create Room" : "Join Room"}
              </button>
            ))}
          </div>

          {/* Tab body */}
          {tab === "create" ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Room Size
                </label>
                <select
                  className={`${input} appearance-none cursor-pointer border-r-8 border-transparent`}
                  value={maxPlayers}
                  onChange={e => setMaxPlayers(Number(e.target.value))}
                >
                  <option value={4} className="text-slate-900">4 Players</option>
                  <option value={3} className="text-slate-900">3 Players</option>
                  <option value={2} className="text-slate-900">2 Players</option>
                </select>
              </div>
              
              <button
                id="btn-create-room"
                onClick={handleCreate}
                disabled={loading || !connected}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40
                           disabled:cursor-not-allowed text-white font-semibold text-sm transition"
              >
                {loading ? "Creating…" : "✨ Create Game"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <input
                id="input-room-code"
                className={`${input} text-center uppercase tracking-widest font-mono font-bold text-base`}
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
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40
                           disabled:cursor-not-allowed text-white font-semibold text-sm transition"
              >
                {loading ? "Joining…" : "🚀 Join Game"}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mt-3 text-xs text-center text-rose-400">{error}</p>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-center text-slate-600 text-xs mt-4">
          Ace of Spades ♠ goes first · Follow suit or Thulla!
        </p>
      </div>
    </div>
  );
}
