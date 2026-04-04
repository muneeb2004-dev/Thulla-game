// ─── In-Memory Room Store ────────────────────────────────────────

const MAX_PLAYERS = 6;
const rooms = new Map();

// Tracks disconnected players in active games, keyed by `${roomId}:${playerName}`.
// Gives them a reconnect window before the slot is freed.
const disconnectedPlayers = new Map();
const RECONNECT_WINDOW_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Generate a unique 6-character alphanumeric room code.
 */
function generateRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O, 1/I
  let code;
  do {
    code = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

/**
 * Create a new room and add the creator as the first player.
 */
function createRoom(socketId, playerName, maxPlayers = 4) {
  const roomId = generateRoomId();

  const player = { id: socketId, name: playerName, isHost: true };

  const room = {
    roomId,
    players: [player],
    maxPlayers,
    gameStatus: "waiting",
    createdAt: Date.now(),
  };

  rooms.set(roomId, room);
  return { room };
}

/**
 * Add a player to an existing room.
 */
function joinRoom(roomId, socketId, playerName) {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found" };
  if (room.players.length >= room.maxPlayers) return { error: "Room is full" };

  const alreadyIn = room.players.some((p) => p.id === socketId);
  if (alreadyIn) return { error: "Already in this room" };

  room.players.push({ id: socketId, name: playerName, isHost: false });
  return { room };
}

/**
 * Remove a player from whatever room they're in.
 * Deletes the room if it becomes empty.
 */
function removePlayer(socketId) {
  for (const [roomId, room] of rooms) {
    const index = room.players.findIndex((p) => p.id === socketId);
    if (index === -1) continue;

    room.players.splice(index, 1);

    if (room.players.length === 0) {
      rooms.delete(roomId);
      return { roomId, dissolved: true };
    }

    const hasHost = room.players.some((p) => p.isHost);
    if (!hasHost) room.players[0].isHost = true;

    return { roomId, room };
  }
  return {};
}

/**
 * Mark a player as disconnected during an active game.
 * Keeps their slot open for RECONNECT_WINDOW_MS so they can rejoin.
 * Only applies when the room's gameStatus is "playing".
 *
 * @returns {{ roomId?, room?, playerName? }} — empty object if not in an active game
 */
function markDisconnected(socketId) {
  for (const [roomId, room] of rooms) {
    const playerIdx = room.players.findIndex((p) => p.id === socketId);
    if (playerIdx === -1) continue;

    // Only hold ghost slots during active games
    if (room.gameStatus !== "playing") return {};

    const player = room.players[playerIdx];
    const playerName = player.name;
    const key = `${roomId}:${playerName}`;

    // Cancel any existing cleanup timer (re-disconnect before reconnect)
    const existing = disconnectedPlayers.get(key);
    if (existing?.cleanupTimer) clearTimeout(existing.cleanupTimer);

    // Mark in-place so the slot remains visible to other players
    player.isDisconnected = true;

    const cleanupTimer = setTimeout(() => {
      disconnectedPlayers.delete(key);
      const r = rooms.get(roomId);
      if (!r) return;

      const idx = r.players.findIndex(
        (p) => p.name === playerName && p.isDisconnected
      );
      if (idx !== -1) r.players.splice(idx, 1);

      // Dissolve room if no active players remain
      const activePlayers = r.players.filter((p) => !p.isDisconnected);
      if (activePlayers.length === 0) {
        rooms.delete(roomId);
      } else if (!r.players.some((p) => p.isHost)) {
        activePlayers[0].isHost = true;
      }
    }, RECONNECT_WINDOW_MS);

    disconnectedPlayers.set(key, { roomId, oldSocketId: socketId, cleanupTimer });

    return { roomId, room, playerName };
  }
  return {};
}

/**
 * Restore a disconnected player with their new socket ID.
 *
 * @returns {{ room?, oldSocketId?, error? }}
 */
function rejoinRoom(roomId, playerName, newSocketId) {
  const key = `${roomId}:${playerName}`;
  const entry = disconnectedPlayers.get(key);

  if (!entry) {
    return { error: "No active session found. Try joining fresh." };
  }

  const room = rooms.get(roomId);
  if (!room) {
    clearTimeout(entry.cleanupTimer);
    disconnectedPlayers.delete(key);
    return { error: "Room no longer exists" };
  }

  clearTimeout(entry.cleanupTimer);
  disconnectedPlayers.delete(key);

  const player = room.players.find((p) => p.id === entry.oldSocketId);
  if (!player) {
    return { error: "Player slot no longer available" };
  }

  const oldSocketId = player.id;
  player.id = newSocketId;
  player.isDisconnected = false;

  return { room, oldSocketId };
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function isRoomFull(roomId) {
  const room = rooms.get(roomId);
  return room ? room.players.length >= room.maxPlayers : false;
}

function getAllRooms() {
  return Array.from(rooms.values());
}

export {
  createRoom,
  joinRoom,
  removePlayer,
  getRoom,
  isRoomFull,
  getAllRooms,
  markDisconnected,
  rejoinRoom,
};
