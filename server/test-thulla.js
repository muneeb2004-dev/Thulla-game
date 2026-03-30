// End-to-end test: Thulla round mechanic
// Verifies: off-suit play accepted, round ends, penalized player picks up cards,
// Thulla player leads next, pile + leadSuit reset.
import { io } from "socket.io-client";

const SERVER = "http://localhost:5000";
const names = ["Alice", "Bob", "Charlie", "Dave"];

const connect  = (name) => new Promise((r) => { const s = io(SERVER); s.on("connect", () => r(s)); });
const waitFor  = (s, ev) => new Promise((r) => s.once(ev, r));
const waitAny  = (sockets, ev) => Promise.all(sockets.map((s) => waitFor(s, ev)));

async function test() {
  console.log("\n🧪 ── Thulla Round Test ─────────────────\n");

  // 1. Setup: connect, create room, start game
  const sockets = [];
  for (const name of names) sockets.push(await connect(name));

  const rp = waitFor(sockets[0], "roomCreated");
  sockets[0].emit("createRoom", { playerName: "Alice" });
  const { roomId } = await rp;

  for (let i = 1; i < 4; i++) {
    const jp = waitFor(sockets[i], "playerJoined");
    sockets[i].emit("joinRoom", { roomId, playerName: names[i] });
    await jp;
  }

  const gp = waitAny(sockets, "gameStarted");
  sockets[0].emit("startGame", { roomId });
  const views = await gp;

  // Map socketId → hand
  const hands = {};
  for (let i = 0; i < 4; i++) hands[sockets[i].id] = [...views[i].hand];
  let currentTurn = views[0].currentTurn;

  // 2. Player 1 leads with any card (sets leadSuit)
  const leaderIdx = sockets.findIndex((s) => s.id === currentTurn);
  const leadCard  = hands[currentTurn][0];
  const leadSuit  = leadCard.suit;

  console.log(`🎯 ${names[leaderIdx]} leads with ${leadCard.value} of ${leadSuit} (leadSuit set)`);

  const cp1 = waitAny(sockets, "cardPlayed");
  sockets[leaderIdx].emit("playCard", { roomId, card: leadCard });
  const r1 = await cp1;
  hands[currentTurn] = hands[currentTurn].filter((c) => c.id !== leadCard.id);
  currentTurn = r1[0].currentTurn;

  // 3. Player 2 plays — but plays a card of a DIFFERENT suit intentionally (Thulla)
  const p2Idx  = sockets.findIndex((s) => s.id === currentTurn);
  const p2Hand = hands[currentTurn];

  // Make sure we pick a card NOT of leadSuit while the player HAS the leadSuit
  const p2OffSuit = p2Hand.find((c) => c.suit !== leadSuit);
  const p2HasLead = p2Hand.some((c) => c.suit === leadSuit);

  if (!p2OffSuit || !p2HasLead) {
    console.log(`⏭  Skip: ${names[p2Idx]} can't Thulla (no off-suit card or no lead suit card)`);
    sockets.forEach((s) => s.disconnect());
    return;
  }

  console.log(
    `🚨 ${names[p2Idx]} plays ${p2OffSuit.value} of ${p2OffSuit.suit} ` +
    `[has ${leadSuit} but playing off-suit → THULLA!]`
  );

  // Expect: cardPlayed + roundEnded from all sockets
  const cpPromises = waitAny(sockets, "cardPlayed");
  sockets[p2Idx].emit("playCard", { roomId, card: p2OffSuit });
  await cpPromises; // cardPlayed fires first

  const rePromises = waitAny(sockets, "roundEnded");
  const roundEndedEvents = await rePromises;

  // 4. Validate roundEnded payload
  const re = roundEndedEvents[0]; // all players get same metadata
  console.log(`\n📊 roundEnded payload:`);
  console.log(`   reason:             ${re.reason}`);
  console.log(`   thullaPlayer:       ${re.thullaPlayerName}`);
  console.log(`   penalizedPlayer:    ${re.penalizedPlayerName}`);
  console.log(`   highestCard:        ${re.highestCard?.value} of ${re.highestCard?.suit}`);
  console.log(`   cardsPickedUp:      ${re.cardsPickedUp}`);
  console.log(`   pile after reset:   ${JSON.stringify(re.pile)}`);
  console.log(`   leadSuit after:     ${re.leadSuit}`);
  console.log(`   nextTurn (Thulla player): ${re.currentTurn === sockets[p2Idx].id ? "✅ Correct" : "❌ Wrong"}`);

  // 5. Assertions
  console.log(`\n🔍 Assertions:`);

  const pileCleared = Array.isArray(re.pile) && re.pile.length === 0;
  console.log(`   Pile reset to []:   ${pileCleared ? "✅" : "❌"}`);

  const leadCleared = re.leadSuit === null;
  console.log(`   leadSuit = null:    ${leadCleared ? "✅" : "❌"}`);

  const thullaLeadsNext = re.currentTurn === sockets[p2Idx].id;
  console.log(`   Thulla player leads:${thullaLeadsNext ? "✅" : "❌"}`);

  const correctReason = re.reason === "thulla";
  console.log(`   reason = "thulla":  ${correctReason ? "✅" : "❌"}`);

  // The penalized player's hand should now have more cards
  const penalizedView = roundEndedEvents[sockets.findIndex((s) => s.id === re.penalizedPlayerId)];
  const expectedHandSize = (re.cardsPickedUp > 0) ? true : false; // they got pile cards
  console.log(`   penalized got cards:${re.cardsPickedUp > 0 ? "✅ " + re.cardsPickedUp + " cards" : "❌"}`);

  if (pileCleared && leadCleared && thullaLeadsNext && correctReason && re.cardsPickedUp > 0) {
    console.log("\n✅ All Thulla round tests passed!\n");
  } else {
    console.log("\n❌ Some assertions failed!\n");
    process.exit(1);
  }

  sockets.forEach((s) => s.disconnect());
  setTimeout(() => process.exit(0), 500);
}

test().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
