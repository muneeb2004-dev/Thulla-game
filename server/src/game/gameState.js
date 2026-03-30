// ─── Game State Manager ──────────────────────────────────────────
// Manages per-room game state: deck, hands, turns, pile, scoring.
// Pure logic — no Socket.io dependency.

import { createDeck, shuffleDeck, distributeCards, formatCard, getCardRank } from "./deck.js";
import { validatePlay, determineTrickWinner } from "./rules.js";

// In-memory game state store, keyed by roomId
const games = new Map();

const ACE_OF_SPADES = "A_spades";

/**
 * Initialize a new game for a room.
 * - Creates & shuffles the deck
 * - Distributes cards equally among players
 * - Finds the player holding the Ace of Spades → they go first
 * - Sets up initial game state (currentTurn, leadSuit, pile)
 *
 * @param {string} roomId
 * @param {object[]} players — array of player objects from roomManager
 * @returns {{ gameState: object, error?: string }}
 */
function initGame(roomId, players) {
  if (!players || players.length < 2) {
    return { error: "Need at least 2 players to start" };
  }

  if (players.length > 4) {
    return { error: "Maximum 4 players allowed" };
  }

  // Create, shuffle, and distribute
  const deck = shuffleDeck(createDeck());
  const { remaining } = distributeCards(players, deck);

  // Find who holds the Ace of Spades → they start
  let firstPlayerId = players[0].id; // fallback
  for (const player of players) {
    const hasAce = player.hand.some((card) => card.id === ACE_OF_SPADES);
    if (hasAce) {
      firstPlayerId = player.id;
      break;
    }
  }

  // Build turn order starting from the first player
  const playerIds = players.map((p) => p.id);
  const firstIdx = playerIds.indexOf(firstPlayerId);
  const turnOrder = [
    ...playerIds.slice(firstIdx),
    ...playerIds.slice(0, firstIdx),
  ];

  // Build the game state
  const gameState = {
    roomId,
    status: "playing",        // "waiting" | "playing" | "finished"
    currentTurn: firstPlayerId,
    turnOrder,                 // clockwise order; safe players are pruned from it
    turnIndex: 0,              // index into turnOrder for current trick
    leadSuit: null,            // set when the first card of a trick is played
    pile: [],                  // cards played in the current trick: { playerId, card }
    scores: {},                // playerId → tricks won
    tricksPlayed: 0,
    safePlayers: [],           // player IDs who ran out of cards (safe)
    remaining,                 // leftover cards (3-player edge case)
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      handCount: p.hand.length,
    })),
  };

  // Initialize scores
  for (const player of players) {
    gameState.scores[player.id] = 0;
  }

  games.set(roomId, gameState);

  console.log(
    `🎮 Game initialized for room ${roomId} | ` +
      `${players.length} players | ` +
      `First turn: ${players.find((p) => p.id === firstPlayerId)?.name} (Ace of Spades ♠)`
  );

  return { gameState };
}

/**
 * Get the game state for a room.
 * @param {string} roomId
 * @returns {object|undefined}
 */
function getGameState(roomId) {
  return games.get(roomId);
}

/**
 * Remove game state when a game ends or room dissolves.
 * @param {string} roomId
 */
function removeGame(roomId) {
  games.delete(roomId);
}

/**
 * Detect newly safe players (hand reached 0), remove them from turnOrder,
 * and check whether only 1 active player remains (that player is the loser).
 *
 * ONLY called at settled moments (after trick completion or Thulla resolution),
 * never during a mid-pile state when cards could still be redistributed.
 *
 * @param {object}   gameState — mutated in place
 * @param {object[]} players   — full player objects with current hand arrays
 * @returns {{ newlySafe: object[], gameEnded: boolean, loser: object|null }}
 */
function checkWinCondition(gameState, players) {
  const newlySafe = [];

  // ── Mark 0-card players as safe ──────────────────────────────
  for (const player of players) {
    if (
      player.hand.length === 0 &&
      !gameState.safePlayers.includes(player.id)
    ) {
      gameState.safePlayers.push(player.id);
      newlySafe.push({ id: player.id, name: player.name });
      console.log(`🛡️  ${player.name} is SAFE! (0 cards)`);
    }
  }

  // ── Prune safe players from turn rotation ──────────────────────
  if (newlySafe.length > 0) {
    gameState.turnOrder = gameState.turnOrder.filter(
      (id) => !gameState.safePlayers.includes(id)
    );
  }

  // ── Check if game is over ─────────────────────────────────
  // Only 1 player left with cards → they are the Thulla loser.
  const activePlayers = players.filter((p) => p.hand.length > 0);

  if (activePlayers.length <= 1) {
    gameState.status = "finished";
    const loser = activePlayers[0] ?? null;
    const loserInfo = loser
      ? { id: loser.id, name: loser.name, handCount: loser.hand.length }
      : null;
    if (loserInfo) {
      console.log(
        `💀 Game ended — ${loserInfo.name} is the Thulla loser ` +
          `(${loserInfo.handCount} cards remaining)`
      );
    }
    return { newlySafe, gameEnded: true, loser: loserInfo };
  }

  // ── If currentTurn belongs to a now-safe player, advance to next active ─
  if (!gameState.turnOrder.includes(gameState.currentTurn)) {
    gameState.turnIndex   = 0;
    gameState.currentTurn = gameState.turnOrder[0] ?? null;
  }

  return { newlySafe, gameEnded: false, loser: null };
}

/**
 * Resolve a Thulla round.
 *
 * Called immediately after a Thulla card is added to the pile.
 * Rules:
 *  - The player who holds the HIGHEST lead-suit card in this pile
 *    picks up ALL cards in the pile as a penalty.
 *  - The Thulla player (who triggered it) leads the NEXT round.
 *  - pile and leadSuit are reset.
 *
 * @param {string}   roomId
 * @param {object}   gameState  — live game state object (mutated in-place)
 * @param {object[]} players    — full player objects with hand arrays
 * @param {string}   thullaPlayerId — socket ID of the Thulla player
 * @returns {object} thulla result metadata
 */
function resolveThullaRound(roomId, gameState, players, thullaPlayerId) {
  const leadSuit = gameState.leadSuit;

  // ── Find the player who holds the highest lead-suit card in the pile ──
  let penalizedPlayerId = null;
  let highestRank = -1;
  let highestCard = null;

  for (const entry of gameState.pile) {
    if (entry.card.suit !== leadSuit) continue; // Thulla card and off-suit cards can't win
    const rank = getCardRank(entry.card.value);
    if (rank > highestRank) {
      highestRank = rank;
      penalizedPlayerId = entry.playerId;
      highestCard = entry.card;
    }
  }

  // ── Penalized player picks up ALL cards in the pile ───────────────────
  const allPileCards = gameState.pile.map((e) => e.card);

  if (penalizedPlayerId) {
    const penalizedPlayer = players.find((p) => p.id === penalizedPlayerId);
    if (penalizedPlayer) {
      penalizedPlayer.hand = [...penalizedPlayer.hand, ...allPileCards];
      // Sync hand count
      const gsP = gameState.players.find((p) => p.id === penalizedPlayerId);
      if (gsP) gsP.handCount = penalizedPlayer.hand.length;
    }
  }

  const thullaPlayerName   = players.find((p) => p.id === thullaPlayerId)?.name   || "?";
  const penalizedPlayerName = players.find((p) => p.id === penalizedPlayerId)?.name || "?";

  console.log(
    `🚨 THULLA by ${thullaPlayerName} | ` +
    `${penalizedPlayerName} picks up ${allPileCards.length} cards ` +
    `(highest: ${highestCard ? formatCard(highestCard) : "none"})`
  );

  // ── Reset round state ─────────────────────────────────────────────────
  gameState.pile     = [];
  gameState.leadSuit = null;

  // Thulla player leads next round
  const thullaIdx = gameState.turnOrder.indexOf(thullaPlayerId);
  if (thullaIdx !== -1) {
    gameState.turnOrder = [
      ...gameState.turnOrder.slice(thullaIdx),
      ...gameState.turnOrder.slice(0, thullaIdx),
    ];
  }
  gameState.turnIndex   = 0;
  gameState.currentTurn = thullaPlayerId;

  return {
    thullaPlayerId,
    thullaPlayerName,
    penalizedPlayerId,
    penalizedPlayerName,
    highestCard,
    cardsPickedUp: allPileCards.length,
  };
}

/**
 * Play a card from a player's hand.
 * Validates via the rules engine, then mutates game state.
 *
 * @param {string} roomId
 * @param {string} playerId  — socket ID
 * @param {object} card      — { id, suit, value }
 * @param {object[]} players — full player objects from roomManager (with hands)
 * @returns {{ success: boolean, error?: string, isThulla?: boolean,
 *             trickComplete?: boolean, trickWinner?: object,
 *             gameOver?: boolean }}
 */
function playCard(roomId, playerId, card, players) {
  const gameState = games.get(roomId);
  if (!gameState) {
    return { success: false, error: "Game not found" };
  }

  if (gameState.status !== "playing") {
    return { success: false, error: "Game is not in progress" };
  }

  // Find the player and their hand
  const player = players.find((p) => p.id === playerId);
  if (!player || !player.hand) {
    return { success: false, error: "Player not found in game" };
  }

  // ── Validate via rules engine ──────────────────────────────
  const validation = validatePlay({
    playerId,
    card,
    hand: player.hand,
    currentTurn: gameState.currentTurn,
    leadSuit: gameState.leadSuit,
  });

  if (!validation.valid) {
    return {
      success: false,
      error: validation.reason,
      isThulla: validation.isThulla || false,
    };
  }

  // ── Mutate state ───────────────────────────────────────────

  // Remove card from hand
  const cardIndex = player.hand.findIndex((c) => c.id === card.id);
  player.hand.splice(cardIndex, 1);

  // Add to pile
  gameState.pile.push({ playerId, card });

  // Set lead suit if this is the first card in the trick
  if (gameState.pile.length === 1) {
    gameState.leadSuit = card.suit;
  }

  // Sync hand count in game state's player list
  const gsPlayer = gameState.players.find((p) => p.id === playerId);
  if (gsPlayer) gsPlayer.handCount = player.hand.length;

  const playerName = player.name || playerId;
  console.log(
    `🃏 ${playerName} played ${formatCard(card)} ` +
      `(pile: ${gameState.pile.length}/${gameState.turnOrder.length})`
  );

  // ── Thulla branch ──────────────────────────────────────────
  // Off-suit play accepted; round ends immediately and pile is redistributed.
  if (validation.isThulla) {
    const thullaResult = resolveThullaRound(roomId, gameState, players, playerId);
    // Win condition check AFTER redistribution (hands have settled)
    const win = checkWinCondition(gameState, players);
    return { success: true, isThulla: true, thullaResult, ...win };
  }

  // ── Normal trick resolution ────────────────────────────────
  const trickComplete = gameState.pile.length === gameState.turnOrder.length;
  let trickResult = null;

  if (trickComplete) {
    const { winnerId, winningCard } = determineTrickWinner(
      gameState.pile,
      gameState.leadSuit
    );

    gameState.scores[winnerId] = (gameState.scores[winnerId] || 0) + 1;
    gameState.tricksPlayed++;

    const winnerName = players.find((p) => p.id === winnerId)?.name || winnerId;
    console.log(
      `🏆 Trick #${gameState.tricksPlayed} won by ${winnerName} ` +
        `with ${formatCard(winningCard)}`
    );

    trickResult = {
      winnerId,
      winnerName,
      winningCard,
      scores: { ...gameState.scores },
      tricksPlayed: gameState.tricksPlayed,
    };

    // Reset pile and leadSuit; trick winner leads next
    gameState.pile     = [];
    gameState.leadSuit = null;

    const winnerIdx = gameState.turnOrder.indexOf(winnerId);
    if (winnerIdx !== -1) {
      gameState.turnOrder = [
        ...gameState.turnOrder.slice(winnerIdx),
        ...gameState.turnOrder.slice(0, winnerIdx),
      ];
    }
    gameState.turnIndex   = 0;
    gameState.currentTurn = gameState.turnOrder[0] ?? null;

    // Win condition check AFTER trick is fully resolved (hands settled)
    const win = checkWinCondition(gameState, players);
    return { success: true, trickComplete: true, trickWinner: trickResult, ...win };
  }

  // Trick not yet complete — advance to next player
  gameState.turnIndex   = gameState.pile.length;
  gameState.currentTurn = gameState.turnOrder[gameState.turnIndex];

  return { success: true, trickComplete: false, trickWinner: null, newlySafe: [], gameEnded: false, loser: null };
}

/**
 * Build a personalized view of the game state for a specific player.
 * Each player sees their own hand but only card counts for opponents.
 *
 * @param {string} roomId
 * @param {object[]} players — full player objects (with hand arrays)
 * @param {string} playerId — the socket ID of the player receiving this view
 * @returns {object}
 */
function getPlayerView(roomId, players, playerId) {
  const gameState = games.get(roomId);
  if (!gameState) return null;

  const self = players.find((p) => p.id === playerId);
  const opponents = players
    .filter((p) => p.id !== playerId)
    .map((p) => ({
      id: p.id,
      name: p.name,
      cardCount: p.hand ? p.hand.length : 0,
    }));

  return {
    roomId: gameState.roomId,
    status: gameState.status,
    currentTurn: gameState.currentTurn,
    leadSuit: gameState.leadSuit,
    pile: gameState.pile,
    scores: gameState.scores,
    tricksPlayed: gameState.tricksPlayed,
    safePlayers: gameState.safePlayers,   // expose safe list to clients
    hand: self?.hand || [],
    opponents,
  };
}

export {
  initGame,
  getGameState,
  removeGame,
  resolveThullaRound,
  checkWinCondition,
  playCard,
  getPlayerView,
};
