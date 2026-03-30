// Unit test: checkWinCondition logic in isolation
import { checkWinCondition } from "./src/game/gameState.js";

function makePlayer(id, name, handLen) {
  return { id, name, hand: Array(handLen).fill({ id: "x", suit: "spades", value: "2" }) };
}

function makeGameState(playerIds) {
  return {
    safePlayers: [],
    turnOrder: [...playerIds],
    turnIndex: 0,
    currentTurn: playerIds[0],
    status: "playing",
  };
}

console.log("\n🧪 ── checkWinCondition Unit Tests ─────\n");

// Test 1: No one safe yet — mid-game
{
  const players = ["a","b","c","d"].map((id, i) => makePlayer(id, id, 10));
  const gs = makeGameState(["a","b","c","d"]);
  const r = checkWinCondition(gs, players);
  console.log(`Test 1 — Mid-game, no one safe`);
  console.log(`  newlySafe: [${r.newlySafe.map(p=>p.name)}] ${r.newlySafe.length === 0 ? "✅" : "❌"}`);
  console.log(`  gameEnded: ${r.gameEnded} ${!r.gameEnded ? "✅" : "❌"}`);
  console.log(`  turnOrder unchanged: [${gs.turnOrder}] ✅\n`);
}

// Test 2: One player reaches 0 cards
{
  const players = [
    makePlayer("a","Alice", 0),  // <-- safe
    makePlayer("b","Bob",   10),
    makePlayer("c","Carol", 10),
    makePlayer("d","Dave",  10),
  ];
  const gs = makeGameState(["a","b","c","d"]);
  const r = checkWinCondition(gs, players);
  console.log(`Test 2 — Alice has 0 cards`);
  console.log(`  newlySafe: [${r.newlySafe.map(p=>p.name)}] ${r.newlySafe[0]?.name === "Alice" ? "✅" : "❌"}`);
  console.log(`  gameEnded: ${r.gameEnded} ${!r.gameEnded ? "✅" : "❌"}`);
  console.log(`  turnOrder has Alice: ${gs.turnOrder.includes("a") ? "❌" : "✅ (removed)"}`);
  console.log(`  safePlayers: [${gs.safePlayers}] ${gs.safePlayers.includes("a") ? "✅" : "❌"}\n`);
}

// Test 3: Three players reach 0 cards — only 1 active → gameEnded
{
  const players = [
    makePlayer("a","Alice", 0),
    makePlayer("b","Bob",   0),
    makePlayer("c","Carol", 0),
    makePlayer("d","Dave",  7),  // <-- loser, still has cards
  ];
  const gs = makeGameState(["a","b","c","d"]);
  const r = checkWinCondition(gs, players);
  console.log(`Test 3 — Only Dave has cards → game ends, Dave is loser`);
  console.log(`  newlySafe count: ${r.newlySafe.length} ${r.newlySafe.length === 3 ? "✅" : "❌"}`);
  console.log(`  gameEnded: ${r.gameEnded} ${r.gameEnded ? "✅" : "❌"}`);
  console.log(`  loser: ${r.loser?.name} ${r.loser?.name === "Dave" ? "✅" : "❌"}`);
  console.log(`  loser.handCount: ${r.loser?.handCount} ${r.loser?.handCount === 7 ? "✅" : "❌"}`);
  console.log(`  status: ${gs.status} ${gs.status === "finished" ? "✅" : "❌"}\n`);
}

// Test 4: Already safe player not double-counted
{
  const players = [
    makePlayer("a","Alice", 0),
    makePlayer("b","Bob",   0),
    makePlayer("c","Carol", 5),
    makePlayer("d","Dave",  5),
  ];
  const gs = makeGameState(["b","c","d"]); // "a" already pruned
  gs.safePlayers = ["a"]; // already marked safe from previous check
  const r = checkWinCondition(gs, players);
  console.log(`Test 4 — Alice already safe; Bob just reached 0`);
  console.log(`  newlySafe: [${r.newlySafe.map(p=>p.name)}] ${r.newlySafe[0]?.name === "Bob" ? "✅" : "❌"} (only Bob, not Alice)`);
  console.log(`  gameEnded: ${r.gameEnded} ${!r.gameEnded ? "✅" : "❌"}`);
  console.log(`  turnOrder: [${gs.turnOrder}] ${!gs.turnOrder.includes("b") ? "✅ (Bob removed)" : "❌"}\n`);
}

// Test 5: currentTurn was safe player → advances to next active
{
  const players = [
    makePlayer("a","Alice", 0),
    makePlayer("b","Bob",   5),
    makePlayer("c","Carol", 5),
    makePlayer("d","Dave",  5),
  ];
  const gs = makeGameState(["a","b","c","d"]);
  gs.currentTurn = "a"; // Alice's turn but she just ran out
  const r = checkWinCondition(gs, players);
  console.log(`Test 5 — currentTurn was Alice (now safe) → advances to Bob`);
  console.log(`  currentTurn: ${gs.currentTurn} ${gs.currentTurn === "b" ? "✅" : "❌"}`);
  console.log(`  gameEnded: ${r.gameEnded} ${!r.gameEnded ? "✅" : "❌"}\n`);
}

console.log("✅ All unit tests done!\n");
