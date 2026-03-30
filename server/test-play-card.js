// End-to-end test: playCard, turn validation, lead suit, Thulla, trick resolution
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
  console.log("\n🧪 ── Play Card Test ───────────────────\n");

  // 1. Connect 4 players, create & fill room, start game
  const sockets = [];
  for (const name of names) {
    sockets.push(await connect(name));
  }

  const roomPromise = waitFor(sockets[0], "roomCreated");
  sockets[0].emit("createRoom", { playerName: "Alice" });
  const { roomId } = await roomPromise;
  console.log(`🏠 Room: ${roomId}`);

  for (let i = 1; i < 4; i++) {
    const jp = waitFor(sockets[i], "playerJoined");
    sockets[i].emit("joinRoom", { roomId, playerName: names[i] });
    await jp;
  }

  // Start game — each player receives their hand
  const gamePromises = sockets.map((s) => waitFor(s, "gameStarted"));
  sockets[0].emit("startGame", { roomId });
  const views = await Promise.all(gamePromises);

  // Map socket index to their game view
  const hands = views.map((v) => v.hand);
  const currentTurn = views[0].currentTurn;

  // Find which socket has the current turn
  const turnIdx = sockets.findIndex((s) => s.id === currentTurn);
  console.log(`🎯 First turn: ${names[turnIdx]} (${hands[turnIdx].length} cards)`);

  // ── Test 1: Wrong turn should fail ────────────────────────
  const wrongIdx = (turnIdx + 1) % 4;
  const errP = waitFor(sockets[wrongIdx], "invalidMove");
  sockets[wrongIdx].emit("playCard", {
    roomId,
    card: hands[wrongIdx][0],
  });
  const err = await errP;
  console.log(`\n✅ Test 1 — Wrong turn blocked: "${err.message}"`);

  // ── Test 2: Valid first card (sets leadSuit) ──────────────
  const firstCard = hands[turnIdx][0];
  const leadSuit = firstCard.suit;

  const playPromises = sockets.map((s) => waitFor(s, "cardPlayed"));
  sockets[turnIdx].emit("playCard", { roomId, card: firstCard });
  const playResults = await Promise.all(playPromises);

  console.log(`✅ Test 2 — ${names[turnIdx]} played ${firstCard.value} of ${firstCard.suit}`);
  console.log(`   Lead suit set: ${playResults[0].leadSuit}`);
  console.log(`   Next turn: ${playResults[0].currentTurn}`);

  // Remove the played card from our local tracking
  hands[turnIdx] = hands[turnIdx].filter((c) => c.id !== firstCard.id);

  // ── Test 3: Thulla detection ──────────────────────────────
  // Find the next player's turn
  const nextTurn = playResults[0].currentTurn;
  const nextIdx = sockets.findIndex((s) => s.id === nextTurn);
  const nextHand = hands[nextIdx];

  // Check if next player has a card of lead suit AND a card NOT of lead suit
  const hasLeadSuit = nextHand.some((c) => c.suit === leadSuit);
  const hasOffSuit = nextHand.some((c) => c.suit !== leadSuit);

  if (hasLeadSuit && hasOffSuit) {
    // Try to play off-suit when they have lead suit → Thulla!
    const offSuitCard = nextHand.find((c) => c.suit !== leadSuit);
    const thullaP = waitFor(sockets[nextIdx], "invalidMove");
    sockets[nextIdx].emit("playCard", { roomId, card: offSuitCard });
    const thulla = await thullaP;
    console.log(`✅ Test 3 — Thulla detected: "${thulla.message}" (isThulla: ${thulla.isThulla})`);
  } else {
    console.log(`⏭  Test 3 — Skipped (player ${names[nextIdx]} doesn't have both suits)`);
  }

  // ── Test 4: Play valid cards to complete the trick ────────
  console.log(`\n🃏 Playing remaining cards for trick #1 (lead: ${leadSuit})...`);

  for (let played = 1; played < 4; played++) {
    const turn = playResults[0].currentTurn; // we'll re-read from latest state
    // Get current turn from the latest view
    const latestViews = sockets.map((s, i) => ({ idx: i, id: s.id }));
    const curTurnIdx = sockets.findIndex((s) => s.id === (played === 1 ? nextTurn : null));

    // We need to dynamically find who should play next
    // After each play, the server tells us currentTurn in cardPlayed
    // Let's use a simpler approach: listen and react

    // Actually, let's just track who plays next from the cardPlayed events
    break; // We've validated the core mechanics, let's do a focused trick test
  }

  // ── Test 5: Play a full trick properly ────────────────────
  // Reconnect fresh to play a clean trick
  console.log(`\n🔄 Starting fresh game for full trick test...`);
  sockets.forEach((s) => s.disconnect());
  await new Promise((r) => setTimeout(r, 500));

  const fresh = [];
  for (const name of names) fresh.push(await connect(name));

  const rp = waitFor(fresh[0], "roomCreated");
  fresh[0].emit("createRoom", { playerName: "Alice" });
  const { roomId: rid2 } = await rp;

  for (let i = 1; i < 4; i++) {
    const jp = waitFor(fresh[i], "playerJoined");
    fresh[i].emit("joinRoom", { roomId: rid2, playerName: names[i] });
    await jp;
  }

  const gp = fresh.map((s) => waitFor(s, "gameStarted"));
  fresh[0].emit("startGame", { roomId: rid2 });
  const gv = await Promise.all(gp);

  // Build a map: socketId → hand, socketId → index
  const playerHands = {};
  for (let i = 0; i < 4; i++) {
    playerHands[fresh[i].id] = [...gv[i].hand];
  }

  let curTurn = gv[0].currentTurn;
  console.log(`\n🎯 Trick #1 — ${names[fresh.findIndex((s) => s.id === curTurn)]} leads\n`);

  let trickLeadSuit = null;

  for (let step = 0; step < 4; step++) {
    const pi = fresh.findIndex((s) => s.id === curTurn);
    const hand = playerHands[curTurn];

    // Pick a valid card: must follow suit if possible
    let cardToPlay;
    if (trickLeadSuit) {
      const suitCard = hand.find((c) => c.suit === trickLeadSuit);
      cardToPlay = suitCard || hand[0]; // off-suit if no choice
    } else {
      cardToPlay = hand[0];
      trickLeadSuit = cardToPlay.suit;
    }

    const cpPromises = fresh.map((s) => waitFor(s, "cardPlayed"));
    fresh[pi].emit("playCard", { roomId: rid2, card: cardToPlay });
    const cpResults = await Promise.all(cpPromises);

    // Remove from local hand
    playerHands[curTurn] = playerHands[curTurn].filter((c) => c.id !== cardToPlay.id);

    console.log(`   ${names[pi]} played ${cardToPlay.value} of ${cardToPlay.suit}`);

    // Get next turn from the response
    curTurn = cpResults[0].currentTurn;
  }

  // We should have received a trickWon event
  // (it fires right after the 4th cardPlayed)
  const trickWon = await waitFor(fresh[0], "trickWon");
  console.log(`\n🏆 Trick won by: ${trickWon.winnerName} with ${trickWon.winningCard.value} of ${trickWon.winningCard.suit}`);
  console.log(`   Scores: ${JSON.stringify(trickWon.scores)}`);

  console.log("\n✅ All playCard tests passed!\n");

  fresh.forEach((s) => s.disconnect());
  setTimeout(() => process.exit(0), 500);
}

test().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
