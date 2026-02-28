# Elevator Simulator — Backend

A real-time, tick-based elevator simulation engine exposed via a REST API. It models `n` elevators serving `k` floors, auto-generates passenger requests, assigns them using a scored SCAN algorithm with starvation prevention, and streams state to the frontend through polling.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Tech Stack](#tech-stack)
3. [Directory Structure](#directory-structure)
4. [Environment Variables](#environment-variables)
5. [Installation](#installation)
6. [Running the Server](#running-the-server)
7. [Available Scripts](#available-scripts)
8. [API Overview](#api-overview)
9. [Architecture Notes](#architecture-notes)

---

## Prerequisites

| Requirement                    | Minimum Version   | Notes                |
| ------------------------------ | ----------------- | -------------------- |
| [Node.js](https://nodejs.org/) | **18.x** or later | LTS recommended      |
| [npm](https://www.npmjs.com/)  | **9.x** or later  | Bundled with Node.js |

> Confirm your versions before proceeding:
>
> ```bash
> node -v
> npm -v
> ```

---

## Tech Stack

| Layer       | Technology            | Purpose                                  |
| ----------- | --------------------- | ---------------------------------------- |
| Runtime     | Node.js + ts-node     | Runs TypeScript directly in development  |
| Language    | TypeScript 5 (strict) | Type-safe codebase across all modules    |
| Framework   | Express 5             | HTTP server and routing                  |
| Middleware  | cors, dotenv          | Cross-origin support, environment config |
| Dev tooling | nodemon               | Auto-restarts the server on file changes |

---

## Directory Structure

```
backend/
├── src/
│   ├── server.ts               # Entry point — mounts API, starts tick loop
│   ├── app.ts                  # Express app creation & middleware setup
│   ├── api/
│   │   ├── index.ts            # Route mounting
│   │   └── routes/
│   │       ├── controls.ts     # POST /api/controls/* (start, stop, reset, config)
│   │       └── metrics.ts      # GET  /api/metrics   (state + computed metrics)
│   ├── config/
│   │   └── defaults.ts         # All simulation constants & rush-window helper
│   ├── models/
│   │   ├── Elevator.ts         # Elevator interface + direction type
│   │   ├── Request.ts          # Passenger request interface
│   │   ├── Stop.ts             # Scheduled stop interface
│   │   └── index.ts            # Re-exports
│   ├── scheduler/
│   │   ├── index.ts            # Public API: handleNewRequest, retryPendingRequests
│   │   ├── assignment.ts       # Eligibility, scoring, elevator selection
│   │   └── scheduling.ts       # SCAN ordering with starvation promotion
│   ├── simulation/
│   │   ├── loop.ts             # tick() — the simulation heartbeat
│   │   ├── state.ts            # In-memory state store (elevators, requests, config)
│   │   └── requestGenerator.ts # Auto-generates passenger requests on a timer
│   └── metrics/
│       └── calculator.ts       # Derived metrics (avg wait, utilisation, etc.)
├── .env                        # Local environment overrides (not committed)
├── package.json
├── tsconfig.json
├── BACKEND.md                  # Deep-dive architecture reference
└── DOCS.md                     # Full project documentation
```

---

## Environment Variables

Create a `.env` file in the `backend/` directory. All variables are optional — defaults are shown below.

```dotenv
# .env
PORT=3001   # Port the HTTP server listens on (default: 3001)
```

> The server reads this file automatically via `dotenv` on startup.

---

## Installation

```bash
# From the repo root
cd backend

# Install all dependencies (production + dev)
npm install
```

This installs:

- **Runtime deps:** `express`, `cors`, `dotenv`
- **Dev deps:** `typescript`, `ts-node`, `nodemon`, and all `@types/*` packages

---

## Running the Server

### Development (recommended)

```bash
npm run dev
```

Starts the server with `nodemon` + `ts-node`. The server restarts automatically whenever a source file changes. Default URL: **http://localhost:3001**

### Production

```bash
# 1. Compile TypeScript to JavaScript
npm run build

# 2. Run the compiled output
npm start
```

The compiled files are output to `dist/`. Make sure to run `npm run build` before `npm start` after any source changes.

---

## Available Scripts

| Script  | Command                                | Description                        |
| ------- | -------------------------------------- | ---------------------------------- |
| `dev`   | `nodemon --exec ts-node src/server.ts` | Development server with hot-reload |
| `build` | `tsc`                                  | Compile TypeScript to `dist/`      |
| `start` | `node dist/server.js`                  | Run compiled production build      |
| `test`  | _(not configured)_                     | Placeholder for future test suite  |

---

## API Overview

All routes are prefixed with `/api`.

| Method | Path                   | Description                                                   |
| ------ | ---------------------- | ------------------------------------------------------------- |
| `GET`  | `/health`              | Server readiness check                                        |
| `GET`  | `/api/metrics`         | Full simulation state + derived metrics                       |
| `POST` | `/api/controls/start`  | Start the simulation                                          |
| `POST` | `/api/controls/stop`   | Pause the simulation                                          |
| `POST` | `/api/controls/reset`  | Reset all state to defaults                                   |
| `POST` | `/api/controls/config` | Update simulation parameters (floors, elevators, speed, etc.) |

See [DOCS.md](./DOCS.md) or [BACKEND.md](./BACKEND.md) for complete request/response schemas and algorithm documentation.

---

## Architecture Notes

- **All state is in-memory.** There is no database. Restarting the server resets the simulation.
- **Tick-based loop.** `server.ts` calls `tick(100)` every 100 ms via `setInterval`. Each tick moves elevators, serves requests, and advances simulation time.
- **Single-threaded.** Node.js's event loop means no concurrency concerns within a tick — no locks needed.
- **SCAN scheduling.** Elevators are ordered using a SCAN (elevator algorithm) variant. A starvation-prevention mechanism promotes long-waiting requests after a configurable timeout.
- **Rush-hour simulation.** The request generator biases towards lobby→upper-floor trips during configurable rush-hour windows.
