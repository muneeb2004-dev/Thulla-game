// ─── In-Memory Room Store ────────────────────────────────────────
// Clean, modular room management with no external dependencies.

const MAX_PLAYERS = 4;
const rooms = new Map();

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
  } while (rooms.has(code)); // guarantee uniqueness
  return code;
}

/**
 * Create a new room and add the creator as the first player.
 * @param {string} socketId
 * @param {string} playerName
 * @param {number} maxPlayers
 * @returns {{ room: object }}
 */
function createRoom(socketId, playerName, maxPlayers = 4) {
  const roomId = generateRoomId();

  const player = {
    id: socketId,
    name: playerName,
    isHost: true,
  };

  const room = {
    roomId,
    players: [player],
    maxPlayers,
    gameStatus: "waiting", // "waiting" | "playing" | "finished"
    createdAt: Date.now(),
  };

  rooms.set(roomId, room);
  return { room };
}

/**
 * Add a player to an existing room.
 * @param {string} roomId
 * @param {string} socketId
 * @param {string} playerName
 * @returns {{ room?: object, error?: string }}
 */
function joinRoom(roomId, socketId, playerName) {
  const room = rooms.get(roomId);

  if (!room) {
    return { error: "Room not found" };
  }

  if (room.players.length >= room.maxPlayers) {
    return { error: "Room is full" };
  }

  const alreadyIn = room.players.some((p) => p.id === socketId);
  if (alreadyIn) {
    return { error: "Already in this room" };
  }

  const player = {
    id: socketId,
    name: playerName,
    isHost: false,
  };

  room.players.push(player);
  return { room };
}

/**
 * Remove a player from whatever room they're in.
 * Deletes the room if it becomes empty.
 * @param {string} socketId
 * @returns {{ roomId?: string, room?: object, dissolved?: boolean }}
 */
function removePlayer(socketId) {
  for (const [roomId, room] of rooms) {
    const index = room.players.findIndex((p) => p.id === socketId);
    if (index === -1) continue;

    room.players.splice(index, 1);

    // Room is empty → dissolve it
    if (room.players.length === 0) {
      rooms.delete(roomId);
      return { roomId, dissolved: true };
    }

    // If the host left, promote the next player
    const hasHost = room.players.some((p) => p.isHost);
    if (!hasHost) {
      room.players[0].isHost = true;
    }

    return { roomId, room };
  }

  return {};
}

/**
 * Get a room by its ID.
 * @param {string} roomId
 * @returns {object|undefined}
 */
function getRoom(roomId) {
  return rooms.get(roomId);
}

/**
 * Check whether a room is full.
 * @param {string} roomId
 * @returns {boolean}
 */
function isRoomFull(roomId) {
  const room = rooms.get(roomId);
  return room ? room.players.length >= room.maxPlayers : false;
}

/**
 * Get all rooms (for debugging / admin).
 * @returns {object[]}
 */
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
};
