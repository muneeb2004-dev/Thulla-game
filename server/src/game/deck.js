// ─── Card Deck System ────────────────────────────────────────────
// Reusable functions for creating, shuffling, and distributing
// a standard 52-card deck.

const SUITS = ["hearts", "diamonds", "clubs", "spades"];

const VALUES = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "J", "Q", "K", "A",
];

// Suit display symbols (useful for logging / debugging)
const SUIT_SYMBOLS = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

/**
 * Create a standard 52-card deck.
 * Each card is an object with `suit`, `value`, and a unique `id`.
 *
 * @returns {{ id: string, suit: string, value: string }[]}
 *
 * @example
 *   const deck = createDeck();
 *   // [{ id: "2_hearts", suit: "hearts", value: "2" }, ...]
 */
function createDeck() {
  const deck = [];

  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({
        id: `${value}_${suit}`,
        suit,
        value,
      });
    }
  }

  return deck;
}

/**
 * Shuffle a deck in-place using Fisher-Yates algorithm.
 * Returns the same array reference for chaining convenience.
 *
 * @param {{ id: string, suit: string, value: string }[]} deck
 * @returns {{ id: string, suit: string, value: string }[]}
 */
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Distribute cards equally among players.
 * Each player object gets a `hand` array with their dealt cards.
 * Leftover cards (if deck doesn't divide evenly) are returned separately.
 *
 * @param {object[]} players   — array of player objects (mutated in-place)
 * @param {{ id: string, suit: string, value: string }[]} [deck]
 *        — optional pre-built deck; a fresh shuffled deck is created if omitted
 * @returns {{ players: object[], remaining: object[] }}
 *
 * @example
 *   const players = [{ id: "s1", name: "Alice" }, { id: "s2", name: "Bob" }];
 *   const { players: dealt, remaining } = distributeCards(players);
 *   // Alice gets 26 cards, Bob gets 26, remaining = []
 */
function distributeCards(players, deck) {
  if (!players || players.length === 0) {
    throw new Error("Need at least one player to distribute cards");
  }

  const cards = deck || shuffleDeck(createDeck());
  const playerCount = players.length;
  const cardsPerPlayer = Math.floor(cards.length / playerCount);

  // Deal cards round-robin style
  for (let i = 0; i < players.length; i++) {
    const start = i * cardsPerPlayer;
    const end = start + cardsPerPlayer;
    players[i].hand = cards.slice(start, end);
  }

  // Any leftover cards that don't divide evenly
  const remaining = cards.slice(playerCount * cardsPerPlayer);

  return { players, remaining };
}

/**
 * Get the numeric rank of a card value for comparison.
 * Ace is highest (14).
 *
 * @param {string} value — card face value ("2"-"10", "J", "Q", "K", "A")
 * @returns {number}
 */
function getCardRank(value) {
  const rankMap = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
    "7": 7, "8": 8, "9": 9, "10": 10,
    J: 11, Q: 12, K: 13, A: 14,
  };
  return rankMap[value] ?? 0;
}

/**
 * Format a card for display / logging.
 *
 * @param {{ suit: string, value: string }} card
 * @returns {string}  e.g. "A♠" or "10♥"
 */
function formatCard(card) {
  return `${card.value}${SUIT_SYMBOLS[card.suit] || "?"}`;
}

export {
  SUITS,
  VALUES,
  SUIT_SYMBOLS,
  createDeck,
  shuffleDeck,
  distributeCards,
  getCardRank,
  formatCard,
};
