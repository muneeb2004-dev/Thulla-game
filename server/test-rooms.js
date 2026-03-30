// Quick smoke test for the room system
// Run: node test-rooms.js

import { io } from "socket.io-client";

const SERVER = "http://localhost:5000";

function connect(name) {
  return new Promise((resolve) => {
    const socket = io(SERVER);
    socket.on("connect", () => {
      console.log(`✅ ${name} connected: ${socket.id}`);
      resolve(socket);
    });
  });
}

async function test() {
  console.log("\n🧪 ── Room System Test ──────────────────\n");

  // 1. Connect two players
  const alice = await connect("Alice");
  const bob = await connect("Bob");

  // 2. Alice creates a room
  const roomCreated = new Promise((resolve) => {
    alice.on("roomCreated", (data) => {
      console.log(`🏠 Room created: ${data.roomId} (${data.players.length} player)`);
      resolve(data);
    });
  });
  alice.emit("createRoom", { playerName: "Alice" });
  const { roomId } = await roomCreated;

  // 3. Bob joins the room
  const playerJoined = new Promise((resolve) => {
    bob.on("playerJoined", (data) => {
      console.log(`👤 ${data.newPlayer} joined room ${data.roomId} (${data.players.length} players)`);
      resolve(data);
    });
  });
  bob.emit("joinRoom", { roomId, playerName: "Bob" });
  await playerJoined;

  // 4. Connect player 3 and 4 to test roomFull
  const charlie = await connect("Charlie");
  const dave = await connect("Dave");

  const p3join = new Promise((r) => charlie.on("playerJoined", r));
  charlie.emit("joinRoom", { roomId, playerName: "Charlie" });
  await p3join;
  console.log(`👤 Charlie joined`);

  const roomFull = new Promise((r) => dave.on("roomFull", r));
  const p4join = new Promise((r) => dave.on("playerJoined", r));
  dave.emit("joinRoom", { roomId, playerName: "Dave" });
  await p4join;
  console.log(`👤 Dave joined`);
  const fullData = await roomFull;
  console.log(`🚫 Room full! ${fullData.players.length}/${4} players`);

  // 5. Try to join a full room
  const eve = await connect("Eve");
  const errorResult = new Promise((r) => eve.on("error", r));
  eve.emit("joinRoom", { roomId, playerName: "Eve" });
  const err = await errorResult;
  console.log(`❌ Eve rejected: "${err.message}"`);

  // 6. Disconnect Bob, check playerLeft
  const playerLeft = new Promise((r) => alice.on("playerLeft", r));
  bob.disconnect();
  const leftData = await playerLeft;
  console.log(`👋 Player left room ${leftData.roomId} (${leftData.players.length} remaining)`);

  console.log("\n✅ All tests passed!\n");

  // Cleanup
  alice.disconnect();
  charlie.disconnect();
  dave.disconnect();
  eve.disconnect();

  setTimeout(() => process.exit(0), 500);
}

test().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
