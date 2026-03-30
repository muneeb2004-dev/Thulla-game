import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { registerHandlers } from "./socket/handlers.js";
import { getAllRooms } from "./game/roomManager.js";

// ─── Configuration ───────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// ─── Express App ─────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));

app.use(express.json());

// ─── HTTP Server ─────────────────────────────────────────────────
const httpServer = createServer(app);

// ─── Socket.io Server ────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ─── REST Endpoints ──────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    status: "running",
    message: "Card Blitz server is live 🃏",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Debug: list active rooms
app.get("/api/rooms", (_req, res) => {
  res.json({ rooms: getAllRooms() });
});

// ─── Socket.io Connection Handling ───────────────────────────────
io.on("connection", (socket) => {
  console.log(`⚡ User connected:    ${socket.id}`);
  registerHandlers(io, socket);
});

// ─── Start Server ────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🃏 ─────────────────────────────────────────`);
  console.log(`   Card Blitz Server`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   CORS origin: Any (*)`);
  console.log(`🃏 ─────────────────────────────────────────\n`);
});

export { app, io, httpServer };
