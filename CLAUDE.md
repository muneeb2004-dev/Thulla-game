# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Card Blitz** is a real-time multiplayer trick-taking card game (the Pakistani game "Thulla") for 2–4 players. It uses a React/Vite frontend and a Node.js/Socket.io backend, both as ES modules.

## Development Commands

### Server (`server/`)
```bash
npm run dev     # nodemon watch mode (development)
npm start       # production run
```

### Client (`client/`)
```bash
npm run dev     # Vite dev server with HMR
npm run build   # production build → dist/
npm run lint    # ESLint
npm run preview # preview production build
```

### Running test scripts (server)
Manual test scripts live at `server/test-*.js`. Run directly with Node:
```bash
node server/test-deck.js
node server/test-rooms.js
node server/test-thulla.js
# etc.
```
There is no test framework — these are standalone scripts that log output to stdout.

## Environment Variables

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `PORT` | server | `5000` | Server listening port |
| `VITE_SERVER_URL` | client `.env` | `http://localhost:5000` | Backend URL for Socket.io |

## Architecture

### Server (`server/src/`)

The server is a **pure in-memory** system with no database. All state is lost on restart.

```
src/
  index.js              — Express app, Socket.io server, REST health endpoints
  game/
    deck.js             — Pure functions: createDeck, shuffleDeck, distributeCards, getCardRank
    rules.js            — Pure validation: validatePlay, determineTrickWinner
    roomManager.js      — In-memory Map of rooms; create/join/leave/query rooms
    gameState.js        — Per-room game state (Map keyed by roomId); all game logic
  socket/
    handlers.js         — Thin Socket.io event → game logic bridge; emits events back to clients
```

**Data flow:** `handlers.js` calls `roomManager` + `gameState`, then emits personalized views to each socket ID directly (not broadcast to room).

**Two separate Maps:** `rooms` (in `roomManager.js`) holds player lists and room metadata; `games` (in `gameState.js`) holds trick state, hands, scores. Both are keyed by `roomId`.

**Personalized views:** `getPlayerView()` in `gameState.js` sends each player their own hand and only card *counts* for opponents — opponents never see each other's cards.

### Client (`client/src/`)

```
context/SocketContext.jsx   — Singleton socket connection; exposes { socket, connected } via useSocket()
pages/Home.jsx              — Create room / join room flow; navigates to /game/:roomId
pages/Game.jsx              — All game UI: Lobby (waiting room), playing phase, finished overlay
components/Card.jsx         — Single card rendering
```

`Game.jsx` is intentionally a single large file containing several co-located sub-components (`Lobby`, `Hand`, `Pile`, `PlayerRow`, `GameOverOverlay`, `ToastStack`). The `applyView()` function in `Game.jsx` is the single point that reconciles incoming server state into React state.

**Socket is obtained via `useSocket()` hook** — never instantiate `io()` directly in components.

### Socket Event Contract

| Client emits | Server emits | Notes |
|---|---|---|
| `createRoom` | `roomCreated` | Host creates with `maxPlayers` (2–4) |
| `joinRoom` | `playerJoined`, `roomFull` | Room code is case-insensitive, uppercased server-side |
| `startGame` | `gameStarted` (personalized per player) | Host only; requires room to be exactly at `maxPlayers` |
| `playCard` | `cardPlayed`, then `roundEnded`/`trickWon`/`playerSafe`/`gameEnded` | |
| *(disconnect)* | `playerLeft` | Room dissolves if last player leaves |

Errors use `error` (general) or `invalidMove` (play-specific) events.

## Game Rules (Thulla)

- Ace of Spades holder goes first; it must be played as the opening card.
- Players must **follow suit**; playing off-suit when you have the lead suit is forbidden.
- If a player has **no card of the lead suit**, they play any card → **Thulla** (the player holding the *highest lead-suit card* in the pile picks up all cards as a penalty; the penalized player leads next).
- Normal trick: all players follow suit; highest lead-suit card wins; winner leads next.
- Players who empty their hand become **safe** and are removed from `turnOrder`.
- The last player still holding cards is the **Thulla loser**.

## Deployment

- **Client** → Vercel (`client/vercel.json` rewrites all routes to `index.html` for SPA routing).
- **Server** → separate host; set `VITE_SERVER_URL` in the client's Vercel environment variables to point at it.
# make whole website theme in black

