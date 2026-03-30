// ─── Socket.io Event Handlers ────────────────────────────────────
// Thin layer that maps socket events to roomManager / gameState logic
// and emits the correct responses back to clients.

import {
  createRoom,
  joinRoom,
  removePlayer,
  isRoomFull,
  getRoom,
} from "../game/roomManager.js";
import { initGame, getPlayerView, removeGame, playCard } from "../game/gameState.js";
import { formatCard } from "../game/deck.js";

/**
 * Register all socket event handlers for a connected client.
 * @param {import("socket.io").Server} io   — the Socket.io server
 * @param {import("socket.io").Socket} socket — the individual connection
 */
export function registerHandlers(io, socket) {
  // ── Create Room ────────────────────────────────────────────────
  socket.on("createRoom", ({ playerName, maxPlayers = 4 } = {}) => {
    if (!playerName?.trim()) {
      return socket.emit("error", { message: "Player name is required" });
    }

    // Must be between 2 and 4
    const validMax = Math.max(2, Math.min(4, Number(maxPlayers) || 4));

    const { room } = createRoom(socket.id, playerName.trim(), validMax);

    // Join the Socket.io channel so broadcasts work
    socket.join(room.roomId);

    console.log(
      `🏠 Room created: ${room.roomId} by ${playerName} (max: ${room.maxPlayers})`
    );

    socket.emit("roomCreated", {
      roomId: room.roomId,
      players: room.players,
      maxPlayers: room.maxPlayers,
    });
  });

  // ── Join Room ────────────────────────────────────────────────
  socket.on("joinRoom", ({ roomId, playerName } = {}) => {
    if (!roomId?.trim() || !playerName?.trim()) {
      return socket.emit("error", {
        message: "Room ID and player name are required",
      });
    }

    const id = roomId.trim().toUpperCase();
    const { room, error } = joinRoom(id, socket.id, playerName.trim());

    if (error) {
      return socket.emit("error", { message: error });
    }

    // Join the Socket.io channel
    socket.join(id);

    console.log(`👤 ${playerName} joined room ${id} (${socket.id})`);

    // Notify everyone in the room (including the new player)
    io.to(id).emit("playerJoined", {
      roomId: id,
      players: room.players,
      maxPlayers: room.maxPlayers,
      newPlayer: playerName.trim(),
    });

    // If the room just filled up, broadcast roomFull
    if (isRoomFull(id)) {
      console.log(`🚫 Room ${id} is now full`);
      io.to(id).emit("roomFull", {
        roomId: id,
        players: room.players,
        maxPlayers: room.maxPlayers,
      });
    }
  });

  // ── Start Game ───────────────────────────────────────────────
  socket.on("startGame", ({ roomId } = {}) => {
    if (!roomId?.trim()) {
      return socket.emit("error", { message: "Room ID is required" });
    }

    const id = roomId.trim().toUpperCase();
    const room = getRoom(id);

    if (!room) {
      return socket.emit("error", { message: "Room not found" });
    }

    // Only the host can start the game
    const isHost = room.players.find((p) => p.id === socket.id)?.isHost;
    if (!isHost) {
      return socket.emit("error", { message: "Only the host can start the game" });
    }

    // Start game requires room.maxPlayers
    if (room.players.length < room.maxPlayers) {
      return socket.emit("error", { 
        message: `Need exactly ${room.maxPlayers} players to start the game` 
      });
    }

    // Prevent double-start
    if (room.gameStatus === "playing") {
      return socket.emit("error", { message: "Game already in progress" });
    }

    // Initialize the game — deals cards, finds Ace of Spades holder
    const { gameState, error } = initGame(id, room.players);

    if (error) {
      return socket.emit("error", { message: error });
    }

    // Mark room as in-play
    room.gameStatus = "playing";

    // Send each player their own personalized view
    // (they see their hand, but only card counts for opponents)
    for (const player of room.players) {
      const view = getPlayerView(id, room.players, player.id);
      io.to(player.id).emit("gameStarted", view);
    }

    console.log(`🎯 Game started in room ${id}`);
  });

  // ── Play Card ────────────────────────────────────────────────
  socket.on("playCard", ({ roomId, card } = {}) => {
    if (!roomId?.trim() || !card?.id) {
      return socket.emit("invalidMove", { message: "Room ID and card are required" });
    }

    const id = roomId.trim().toUpperCase();
    const room = getRoom(id);
    if (!room) {
      return socket.emit("invalidMove", { message: "Room not found" });
    }

    // Execute the play — rules + gameState handle all validation and mutation
    const result = playCard(id, socket.id, card, room.players);

    if (!result.success) {
      // Only hard errors reach here now (not your turn, card not in hand, etc.)
      return socket.emit("invalidMove", { message: result.error });
    }

    const playerName = room.players.find((p) => p.id === socket.id)?.name || "Unknown";

    // ── Always broadcast the card that was played ─────────────
    // Each player gets a personalized view (own hand, opponents' card counts)
    for (const player of room.players) {
      const view = getPlayerView(id, room.players, player.id);
      io.to(player.id).emit("cardPlayed", {
        playerId: socket.id,
        playerName,
        card,
        ...view,
      });
    }

    // ── Thulla branch — round ends immediately ────────────────
    if (result.isThulla) {
      const t = result.thullaResult;
      console.log(`🚨 roundEnded (Thulla) in room ${id}`);

      for (const player of room.players) {
        const view = getPlayerView(id, room.players, player.id);
        io.to(player.id).emit("roundEnded", {
          reason: "thulla",
          thullaPlayerId:      t.thullaPlayerId,
          thullaPlayerName:    t.thullaPlayerName,
          penalizedPlayerId:   t.penalizedPlayerId,
          penalizedPlayerName: t.penalizedPlayerName,
          highestCard:         t.highestCard,
          cardsPickedUp:       t.cardsPickedUp,
          ...view,
        });
      }

      // ── Emit safe events (may follow a Thulla) ───────────────
      for (const safe of result.newlySafe ?? []) {
        console.log(`🛡️  Emitting playerSafe: ${safe.name}`);
        io.to(id).emit("playerSafe", { playerId: safe.id, playerName: safe.name });
      }

      // ── Game over by card depletion ───────────────────────────
      if (result.gameEnded) {
        room.gameStatus = "finished";
        io.to(id).emit("gameEnded", {
          loser:       result.loser,
          safePlayers: room.players
            .filter((p) => p.id !== result.loser?.id)
            .map((p) => ({ id: p.id, name: p.name })),
        });
        console.log(`💀 gameEnded — loser: ${result.loser?.name ?? "nobody"}`);
      }
      return;
    }

    // ── Normal trick path ─────────────────────────────────────
    if (result.trickComplete && result.trickWinner) {
      io.to(id).emit("trickWon", result.trickWinner);

      // ── Emit safe events (may follow a trick completion) ─────
      for (const safe of result.newlySafe ?? []) {
        console.log(`🛡️  Emitting playerSafe: ${safe.name}`);
        io.to(id).emit("playerSafe", { playerId: safe.id, playerName: safe.name });
      }

      // ── Game over by card depletion ───────────────────────────
      if (result.gameEnded) {
        room.gameStatus = "finished";
        io.to(id).emit("gameEnded", {
          loser:       result.loser,
          safePlayers: room.players
            .filter((p) => p.id !== result.loser?.id)
            .map((p) => ({ id: p.id, name: p.name })),
        });
        console.log(`💀 gameEnded — loser: ${result.loser?.name ?? "nobody"}`);
      }
    }
  });

  // ── Disconnect ───────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    console.log(`🔌 User disconnected: ${socket.id} (${reason})`);

    const result = removePlayer(socket.id);

    if (result.dissolved) {
      removeGame(result.roomId);
      console.log(`💨 Room ${result.roomId} dissolved (empty)`);
    } else if (result.room) {
      // Let remaining players know someone left
      io.to(result.roomId).emit("playerLeft", {
        roomId: result.roomId,
        players: result.room.players,
        disconnectedId: socket.id,
      });
      console.log(
        `👋 Removed ${socket.id} from room ${result.roomId} ` +
          `(${result.room.players.length} remaining)`
      );
    }
  });
}
