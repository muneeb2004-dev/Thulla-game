// ─── Game Rules Engine ───────────────────────────────────────────
// Pure validation logic for trick-taking card play.
// No Socket.io, no state mutation — just returns verdicts.

import { getCardRank } from "./deck.js";

/**
 * Validate whether a player can legally play a specific card.
 *
 * Rules:
 *  1. It must be the player's turn.
 *  2. The card must exist in their hand.
 *  3. If a leadSuit is set (not the first card in the trick),
 *     the player MUST follow suit if they have a card of that suit.
 *     Playing off-suit when you have the lead suit → Thulla.
 *
 * @param {object}   params
 * @param {string}   params.playerId    — socket ID of the player trying to play
 * @param {object}   params.card        — { id, suit, value }
 * @param {object[]} params.hand        — player's current hand
 * @param {string}   params.currentTurn — socket ID of whose turn it is
 * @param {string|null} params.leadSuit — the suit of the first card in this trick
 * @returns {{ valid: boolean, reason?: string, isThulla?: boolean }}
 */
function validatePlay({ playerId, card, hand, currentTurn, leadSuit }) {
  // Rule: Must be your turn
  if (playerId !== currentTurn) {
    return { valid: false, reason: "Not your turn" };
  }

  // Rule: Card must be in your hand
  const cardInHand = hand.find((c) => c.id === card.id);
  if (!cardInHand) {
    return { valid: false, reason: "Card not in your hand" };
  }

  // Rule: Must follow lead suit if possible.
  // A Thulla happens when you DON'T have the lead suit and are forced to play off-suit.
  if (leadSuit && card.suit !== leadSuit) {
    const hasLeadSuit = hand.some((c) => c.suit === leadSuit);
    
    // If you have the lead suit, you CANNOT play off-suit. Invalid move.
    if (hasLeadSuit) {
      return { valid: false, reason: `You must follow suit (${leadSuit})` };
    }
    
    // If you DON'T have the lead suit, you play any card and it triggers a THULLA!
    return { valid: true, isThulla: true };
  }

  return { valid: true };
}

/**
 * Determine the winner of a completed trick.
 * The highest-ranked card of the lead suit wins.
 * (Off-suit cards cannot win, regardless of rank.)
 *
 * @param {object[]} pile     — array of { playerId, card } entries
 * @param {string}   leadSuit — the suit that was led
 * @returns {{ winnerId: string, winningCard: object }}
 */
function determineTrickWinner(pile, leadSuit) {
  let winnerId = pile[0].playerId;
  let highestRank = -1;
  let winningCard = null;

  for (const entry of pile) {
    // Only cards matching the lead suit can win
    if (entry.card.suit !== leadSuit) continue;

    const rank = getCardRank(entry.card.value);
    if (rank > highestRank) {
      highestRank = rank;
      winnerId = entry.playerId;
      winningCard = entry.card;
    }
  }

  return { winnerId, winningCard };
}

export { validatePlay, determineTrickWinner };
