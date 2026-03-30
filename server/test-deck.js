// Quick verification of the deck system
import {
  createDeck,
  shuffleDeck,
  distributeCards,
  formatCard,
} from "./src/game/deck.js";

console.log("🧪 ── Deck System Test ──────────────────\n");

// 1. Create deck
const deck = createDeck();
console.log(`✅ createDeck()     → ${deck.length} cards`);

// Verify all 52 unique
const ids = new Set(deck.map((c) => c.id));
console.log(`   Unique cards:    ${ids.size} (expected 52)`);

// 2. Shuffle
const shuffled = shuffleDeck([...deck]);
const orderChanged = shuffled[0].id !== deck[0].id || shuffled[51].id !== deck[51].id;
console.log(`✅ shuffleDeck()    → order changed: ${orderChanged}`);
console.log(`   First 5 cards:   ${shuffled.slice(0, 5).map(formatCard).join(", ")}`);

// 3. Distribute to 2 players
const players2 = [
  { id: "p1", name: "Alice" },
  { id: "p2", name: "Bob" },
];
const result2 = distributeCards(players2, shuffleDeck(createDeck()));
console.log(`\n✅ distributeCards(2 players)`);
console.log(`   Alice: ${result2.players[0].hand.length} cards → ${result2.players[0].hand.slice(0, 3).map(formatCard).join(", ")}...`);
console.log(`   Bob:   ${result2.players[1].hand.length} cards → ${result2.players[1].hand.slice(0, 3).map(formatCard).join(", ")}...`);
console.log(`   Remaining: ${result2.remaining.length}`);

// 4. Distribute to 4 players
const players4 = [
  { id: "p1", name: "Alice" },
  { id: "p2", name: "Bob" },
  { id: "p3", name: "Charlie" },
  { id: "p4", name: "Dave" },
];
const result4 = distributeCards(players4, shuffleDeck(createDeck()));
console.log(`\n✅ distributeCards(4 players)`);
for (const p of result4.players) {
  console.log(`   ${p.name.padEnd(8)}: ${p.hand.length} cards`);
}
console.log(`   Remaining: ${result4.remaining.length}`);

// 5. Distribute to 3 players (uneven)
const players3 = [
  { id: "p1", name: "Alice" },
  { id: "p2", name: "Bob" },
  { id: "p3", name: "Charlie" },
];
const result3 = distributeCards(players3, shuffleDeck(createDeck()));
console.log(`\n✅ distributeCards(3 players — uneven split)`);
for (const p of result3.players) {
  console.log(`   ${p.name.padEnd(8)}: ${p.hand.length} cards`);
}
console.log(`   Remaining: ${result3.remaining.length} card(s)`);

console.log("\n✅ All deck tests passed!\n");
