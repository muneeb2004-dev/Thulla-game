// ─── Socket.io Event Handlers ────────────────────────────────────
// Thin layer that maps socket events to roomManager / gameState logic
// and emits the correct responses back to clients.

import {
  createRoom,
  joinRoom,
  removePlayer,
  isRoomFull,
  getRoom,
  markDisconnected,
  rejoinRoom as rejoinRoomManager,
} from "../game/roomManager.js";
import {
  initGame,
  getPlayerView,
  getGameState,
  removeGame,
  playCard,
  updatePlayerId,
} from "../game/gameState.js";
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

    // Must be between 2 and 6
    const validMax = Math.max(2, Math.min(6, Number(maxPlayers) || 4));

    const { room } = createRoom(socket.id, playerName.trim(), validMax);

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

    socket.join(id);

    console.log(`👤 ${playerName} joined room ${id} (${socket.id})`);

    io.to(id).emit("playerJoined", {
      roomId: id,
      players: room.players,
      maxPlayers: room.maxPlayers,
      newPlayer: playerName.trim(),
    });

    if (isRoomFull(id)) {
      console.log(`🚫 Room ${id} is now full`);
      io.to(id).emit("roomFull", {
        roomId: id,
        players: room.players,
        maxPlayers: room.maxPlayers,
      });
    }
  });

  // ── Rejoin Room (reconnect) ───────────────────────────────────
  socket.on("rejoinRoom", ({ roomId, playerName } = {}) => {
    if (!roomId?.trim() || !playerName?.trim()) {
      return socket.emit("rejoinError", { message: "Room ID and player name are required" });
    }

    const id = roomId.trim().toUpperCase();
    const { room, oldSocketId, error } = rejoinRoomManager(id, playerName.trim(), socket.id);

    if (error) {
      console.log(`❌ Rejoin failed for ${playerName} in room ${id}: ${error}`);
      return socket.emit("rejoinError", { message: error });
    }

    // Update player ID in game state
    updatePlayerId(id, oldSocketId, socket.id);

    // Rejoin the socket.io channel
    socket.join(id);

    console.log(`🔄 ${playerName} rejoined room ${id} (${oldSocketId} → ${socket.id})`);

    // Notify others
    io.to(id).emit("playerRejoined", {
      playerName: playerName.trim(),
      players: room.players,
    });

    // Send current game state back to the rejoining player
    const gameState = getGameState(id);
    if (gameState && gameState.status === "playing") {
      const view = getPlayerView(id, room.players, socket.id);
      socket.emit("gameRejoined", {
        roomId: id,
        players: room.players,
        maxPlayers: room.maxPlayers,
        phase: "playing",
        gameView: view,
      });
    } else if (gameState && gameState.status === "finished") {
      socket.emit("gameRejoined", {
        roomId: id,
        players: room.players,
        maxPlayers: room.maxPlayers,
        phase: "finished",
        gameView: getPlayerView(id, room.players, socket.id),
      });
    } else {
      // Still in lobby
      socket.emit("gameRejoined", {
        roomId: id,
        players: room.players,
        maxPlayers: room.maxPlayers,
        phase: "lobby",
        gameView: null,
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

    const isHost = room.players.find((p) => p.id === socket.id)?.isHost;
    if (!isHost) {
      return socket.emit("error", { message: "Only the host can start the game" });
    }

    if (room.players.length < room.maxPlayers) {
      return socket.emit("error", {
        message: `Need exactly ${room.maxPlayers} players to start the game`,
      });
    }

    if (room.gameStatus === "playing") {
      return socket.emit("error", { message: "Game already in progress" });
    }

    const { gameState, error } = initGame(id, room.players);

    if (error) {
      return socket.emit("error", { message: error });
    }

    room.gameStatus = "playing";

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

    const result = playCard(id, socket.id, card, room.players);

    if (!result.success) {
      return socket.emit("invalidMove", { message: result.error });
    }

    const playerName = room.players.find((p) => p.id === socket.id)?.name || "Unknown";

    // ── Always broadcast the card that was played ─────────────
    // If the trick or thulla just completed, override the pile in the view so
    // all players see the FULL pile (including the last card) before it clears.
    const pileOverride = result.completedPile ?? result.thullaPile ?? null;

    for (const player of room.players) {
      const view = getPlayerView(id, room.players, player.id);
      io.to(player.id).emit("cardPlayed", {
        playerId: socket.id,
        playerName,
        card,
        ...view,
        // Override pile so last card is visible before resolution
        ...(pileOverride ? { pile: pileOverride } : {}),
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

      for (const safe of result.newlySafe ?? []) {
        console.log(`🛡️  Emitting playerSafe: ${safe.name}`);
        io.to(id).emit("playerSafe", { playerId: safe.id, playerName: safe.name });
      }

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
      // Send trickWon with a personalized view so each client can update
      // scores, currentTurn etc. while keeping the pile visible (pile is
      // intentionally NOT included here — clients keep the pile from cardPlayed)
      for (const player of room.players) {
        const view = getPlayerView(id, room.players, player.id);
        io.to(player.id).emit("trickWon", {
          ...result.trickWinner,
          currentTurn:  view.currentTurn,
          hand:         view.hand,
          opponents:    view.opponents,
          safePlayers:  view.safePlayers,
          leadSuit:     view.leadSuit,
        });
      }

      for (const safe of result.newlySafe ?? []) {
        console.log(`🛡️  Emitting playerSafe: ${safe.name}`);
        io.to(id).emit("playerSafe", { playerId: safe.id, playerName: safe.name });
      }

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

    const markResult = markDisconnected(socket.id);

    if (markResult.roomId) {
      // Active game — keep player as ghost, notify others
      io.to(markResult.roomId).emit("playerLeft", {
        roomId:         markResult.roomId,
        players:        markResult.room?.players ?? [],
        disconnectedId: socket.id,
        isTemporary:    true,
      });
      console.log(
        `👻 ${markResult.playerName} disconnected from room ${markResult.roomId} — ` +
          `held for reconnect window`
      );
    } else {
      // Not in a game (lobby or unknown) — remove immediately
      const result = removePlayer(socket.id);

      if (result.dissolved) {
        removeGame(result.roomId);
        console.log(`💨 Room ${result.roomId} dissolved (empty)`);
      } else if (result.room) {
        io.to(result.roomId).emit("playerLeft", {
          roomId:         result.roomId,
          players:        result.room.players,
          disconnectedId: socket.id,
          isTemporary:    false,
        });
        console.log(
          `👋 Removed ${socket.id} from room ${result.roomId} ` +
            `(${result.room.players.length} remaining)`
        );
      }
    }
  });
}
