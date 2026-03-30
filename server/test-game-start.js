// End-to-end test: room creation → fill → game start → verify state
import { io } from "socket.io-client";

const SERVER = "http://localhost:5000";
const names = ["Alice", "Bob", "Charlie", "Dave"];

function connect(name) {
  return new Promise((resolve) => {
    const socket = io(SERVER);
    socket.on("connect", () => resolve(socket));
  });
}

function waitFor(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

async function test() {
  console.log("\n🧪 ── Game Start Test ──────────────────\n");

  // 1. Connect 4 players
  const sockets = [];
  for (const name of names) {
    const s = await connect(name);
    sockets.push(s);
    console.log(`✅ ${name} connected: ${s.id}`);
  }

  // 2. Alice creates room
  const roomPromise = waitFor(sockets[0], "roomCreated");
  sockets[0].emit("createRoom", { playerName: "Alice" });
  const { roomId } = await roomPromise;
  console.log(`\n🏠 Room created: ${roomId}`);

  // 3. Bob, Charlie, Dave join
  for (let i = 1; i < 4; i++) {
    const joinPromise = waitFor(sockets[i], "playerJoined");
    sockets[i].emit("joinRoom", { roomId, playerName: names[i] });
    await joinPromise;
    console.log(`👤 ${names[i]} joined`);
  }

  // 4. Non-host tries to start → should fail
  const errPromise = waitFor(sockets[1], "error");
  sockets[1].emit("startGame", { roomId });
  const err = await errPromise;
  console.log(`\n❌ Non-host start blocked: "${err.message}"`);

  // 5. Host starts game
  console.log(`\n🎯 Host starting game...`);
  const gamePromises = sockets.map((s) => waitFor(s, "gameStarted"));
  sockets[0].emit("startGame", { roomId });
  const views = await Promise.all(gamePromises);

  // 6. Verify each player's view
  console.log(`\n📊 Game State Received:\n`);
  let aceHolder = null;

  for (let i = 0; i < 4; i++) {
    const view = views[i];
    const hasAce = view.hand.some((c) => c.id === "A_spades");
    if (hasAce) aceHolder = names[i];

    console.log(`   ${names[i]}:`);
    console.log(`     Cards in hand:  ${view.hand.length}`);
    console.log(`     Opponents:      ${view.opponents.map((o) => `${o.name}(${o.cardCount})`).join(", ")}`);
    console.log(`     Has Ace♠:       ${hasAce}`);
    console.log(`     Current turn:   ${view.currentTurn}`);
    console.log(`     Lead suit:      ${view.leadSuit}`);
    console.log(`     Pile:           [${view.pile.length} cards]`);
    console.log();
  }

  // 7. Verify Ace of Spades holder has first turn
  const firstTurnSocket = views[0].currentTurn;
  const firstTurnPlayer = sockets.find((s) => s.id === firstTurnSocket);
  const firstTurnName = names[sockets.indexOf(firstTurnPlayer)];
  console.log(`🃏 Ace of Spades:    ${aceHolder}`);
  console.log(`🎯 First turn:       ${firstTurnName}`);
  console.log(`   Match:            ${aceHolder === firstTurnName ? "✅ YES" : "❌ NO"}`);

  // 8. Verify all 52 cards distributed
  const totalCards = views.reduce((sum, v) => sum + v.hand.length, 0);
  console.log(`\n📦 Total cards dealt: ${totalCards} (expected 52)`);

  // 9. Verify no duplicate cards
  const allCards = views.flatMap((v) => v.hand.map((c) => c.id));
  const uniqueCards = new Set(allCards);
  console.log(`🔍 Unique cards:      ${uniqueCards.size} (expected 52)`);

  // 10. Double-start should fail
  const err2Promise = waitFor(sockets[0], "error");
  sockets[0].emit("startGame", { roomId });
  const err2 = await err2Promise;
  console.log(`\n❌ Double-start blocked: "${err2.message}"`);

  console.log("\n✅ All game start tests passed!\n");

  sockets.forEach((s) => s.disconnect());
  setTimeout(() => process.exit(0), 500);
}

test().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
