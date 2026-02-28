# Elevator Simulator — Backend Documentation

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Directory Structure](#directory-structure)
4. [Getting Started](#getting-started)
5. [Architecture](#architecture)
6. [Data Models](#data-models)
7. [Configuration](#configuration)
8. [REST API](#rest-api)
9. [Simulation Engine](#simulation-engine)
10. [Scheduler & Assignment](#scheduler--assignment)
11. [Metrics](#metrics)
12. [Key Algorithms](#key-algorithms)

---

## Overview

The backend is a real-time, tick-based elevator simulation engine exposed via a REST API. It models `n` elevators serving `k` floors, generates passenger requests automatically, assigns them to elevators using a scoring algorithm, and moves elevators according to a SCAN-based scheduling strategy. The frontend polls the API to visualize state and metrics.

All state is held in memory — there is no database. The simulation advances via a fixed-interval timer (`setInterval`) that calls the `tick()` function every 100ms of wall-clock time.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js with ts-node |
| Language | TypeScript (strict mode) |
| Framework | Express 5 |
| CORS | cors middleware |
| Dev tooling | nodemon, ts-node |

---

## Directory Structure

```
backend/
├── src/
│   ├── server.ts                  # Entry point — mounts API, starts tick loop
│   ├── app.ts                     # Express app creation & middleware
│   ├── api/
│   │   ├── index.ts               # Route mounting
│   │   └── routes/
│   │       ├── controls.ts        # POST /api/controls/* (start, stop, reset, config)
│   │       └── metrics.ts         # GET  /api/metrics   (state + computed metrics)
│   ├── config/
│   │   └── defaults.ts            # All simulation constants & rush-window helper
│   ├── models/
│   │   ├── Elevator.ts            # Elevator interface
│   │   ├── Request.ts             # Passenger request interface
│   │   ├── Stop.ts                # Scheduled stop interface
│   │   └── index.ts               # Re-exports
│   ├── scheduler/
│   │   ├── index.ts               # Public API: handleNewRequest, retryPendingRequests
│   │   ├── assignment.ts          # Eligibility, scoring, elevator selection
│   │   └── scheduling.ts          # SCAN ordering with starvation promotion
│   ├── simulation/
│   │   ├── loop.ts                # tick() — the simulation heartbeat
│   │   ├── state.ts               # In-memory state store (elevators, requests, config)
│   │   └── requestGenerator.ts    # Auto-generates passenger requests
│   └── metrics/
│       └── calculator.ts          # Derived metrics (avg wait, utilization, etc.)
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Getting Started

```bash
cd backend
npm install
npm run dev        # Starts with nodemon + ts-node on port 3001
```

Production:

```bash
npm run build      # Compiles to dist/
npm start          # Runs dist/server.js
```

Environment variables (`.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP server port |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      server.ts                          │
│  mountApi(app)  ·  resetState()  ·  setInterval(tick)   │
└────────────┬───────────────┬───────────────┬────────────┘
             │               │               │
     ┌───────▼───────┐  ┌───▼────┐   ┌──────▼──────┐
     │   API Layer   │  │  Tick  │   │    State    │
     │ controls.ts   │  │ loop.ts│◄──│  state.ts   │
     │ metrics.ts    │  │        │──►│             │
     └───────────────┘  └───┬────┘   └─────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
      ┌───────▼──────┐ ┌───▼────┐ ┌──────▼──────┐
      │  Request     │ │Scheduler│ │  Metrics    │
      │  Generator   │ │        │ │  Calculator │
      │              │ │assignment│ │             │
      └──────────────┘ │scheduling│ └─────────────┘
                       └─────────┘
```

### Tick Lifecycle (every 100ms wall-clock)

1. **Advance sim time** — `simTime += deltaMs * speedMultiplier`
2. **Generate requests** — `maybeEmitRequest()` creates a new request if enough sim-time has passed
3. **Reorder stops** — Each elevator's stop queue is re-sorted using SCAN with starvation promotion
4. **Move elevators** — For each discrete floor-step the time budget allows, move elevators toward their next stop (or idle pre-position target)
5. **Close doors** — Doors that have been open long enough are closed
6. **Retry pending** — Unassigned requests are retried every 2s of sim-time
7. **Garbage collect** — Completed requests older than 120s are pruned every 60s

---

## Data Models

### Elevator

```typescript
interface Elevator {
  id: string;                    // e.g. "elevator-0"
  currentFloor: number;          // 0-indexed
  direction: 'up' | 'down' | 'idle';
  doorOpen: boolean;
  passengers: number;            // Current onboard count
  stops: Stop[];                 // Ordered queue of scheduled stops
}
```

### Request

Represents a single passenger's journey from an origin floor to a destination floor.

```typescript
interface Request {
  id: string;                    // e.g. "req-5000-a3f9b2c"
  timestamp: number;             // Sim-time (ms) when created
  originFloor: number;
  destFloor: number;
  direction: 'up' | 'down';
  assignedElevatorId?: string;   // Set when assigned to an elevator
  pickupTime?: number;           // Sim-time when passenger boarded
  completionTime?: number;       // Sim-time when passenger arrived
  rejectedAt?: number;           // Sim-time if rejected (queue full)
}
```

**Request lifecycle:**

```
Created → [rejectedAt set]  → Rejected (terminal)
       → [assignedElevatorId set] → Assigned
           → [pickupTime set] → Picked up (onboard)
               → [completionTime set] → Completed (terminal)
       → (no eligible elevator) → Pending (retried every 2s)
```

### Stop

A single entry in an elevator's stop queue.

```typescript
interface Stop {
  floor: number;
  type: 'pickup' | 'dropoff';
  requestIds: string[];          // Which requests this stop serves
}
```

---

## Configuration

All constants live in `src/config/defaults.ts` as a frozen `defaults` object:

| Key | Value | Description |
|-----|-------|-------------|
| `numElevators` | `4` | Default elevator count |
| `numFloors` | `10` | Default floor count (0-indexed: floors 0–9) |
| `requestFrequencyMs` | `5000` | Minimum sim-time gap between auto-generated requests |
| `rushLobbyFraction` | `0.7` | During rush, 70% of requests originate from the lobby |
| `rushStartMs` | `32400000` | Rush window start (9:00:00 in sim-time ms) |
| `rushDurationMs` | `1800000` | Rush window duration (30 minutes) |
| `starvationThresholdMs` | `30000` | After 30s of waiting, a request is "starved" and gets priority |
| `lobbyFloor` | `0` | The lobby/ground floor index |
| `elevatorCapacity` | `8` | Max passengers per elevator |
| `maxPendingRequests` | `100` | Max unassigned requests before backpressure rejects new ones |
| `drainIntervalMs` | `60000` | How often (sim-ms) to garbage-collect completed requests |
| `drainAgeMs` | `120000` | Completed requests older than this are pruned |

### Rush Window

The function `isRushWindow(now)` returns `true` when `now` is between `rushStartMs` and `rushStartMs + rushDurationMs`. During this window:
- 70% of generated requests originate from the lobby going up
- Idle elevators pre-position to the lobby floor
- The scoring algorithm gives a bonus to elevators near the lobby

---

## REST API

Base path: `/api`

### Health Check

```
GET /health
→ { "ok": true }
```

### Controls

All control endpoints return `{ "ok": true, ... }`.

#### Start Simulation

```
POST /api/controls/start
→ { "ok": true, "running": true }
```

Sets `isRunning = true`. The tick loop only advances when running.

#### Stop Simulation

```
POST /api/controls/stop
→ { "ok": true, "running": false }
```

Pauses the simulation. State is preserved.

#### Reset Simulation

```
POST /api/controls/reset
→ { "ok": true }
```

Resets all state to defaults: clears all requests, resets sim time to 0, recreates elevators at floor 0, resets all internal timers.

#### Configure Simulation

```
POST /api/controls/config
Content-Type: application/json

{
  "numFloors": 10,
  "numElevators": 4,
  "speed": 2,
  "requestFrequencyMs": 3000
}
```

All fields are optional. After updating config, elevators are reinitialized.

| Field | Type | Description |
|-------|------|-------------|
| `numFloors` | number | Number of floors |
| `numElevators` | number | Number of elevators |
| `speed` | number | Time multiplier (1 = real-time, 10 = 10x fast) |
| `requestFrequencyMs` | number | Min sim-time between generated requests |

### Metrics / State

```
GET /api/metrics
```

Returns the complete simulation snapshot:

```json
{
  "simTimeMs": 45000,
  "isRunning": true,
  "speedMultiplier": 1,
  "requestFrequencyMs": 5000,
  "numFloors": 10,
  "numElevators": 4,
  "elevatorCapacity": 8,
  "elevators": [ /* Elevator[] */ ],
  "requests": [ /* Request[] */ ],
  "metrics": {
    "averageWaitTimeMs": 4200,
    "maxWaitTimeMs": 12000,
    "averageTravelTimeMs": 3500,
    "utilization": {
      "elevator-0": 0.4,
      "elevator-1": 0.6
    },
    "pendingCount": 3,
    "rejectedCount": 0
  }
}
```

---

## Simulation Engine

### Tick Loop (`simulation/loop.ts`)

The core function is `tick(deltaMs)`, called every 100ms of wall-clock time by `setInterval` in `server.ts`.

**Time model:**
- `travelBudget = deltaMs * speedMultiplier` — how much sim-time passes this tick
- Elevator speed is 1 floor per `FLOOR_MS` (1000ms of sim-time)
- A fractional `travelAccumulator` carries over sub-floor movement between ticks

**Elevator movement per tick:**

```
For each discrete floor-step in the time budget:
  For each elevator:
    If door is open → skip (waiting)
    If stops queue is not empty → move 1 floor toward next stop
      If arrived at stop → serve it (open door, board/deboard passengers)
    If stops queue is empty → move toward idle pre-position target
```

### Idle Pre-Positioning

When an elevator has no stops, it moves toward a target floor:

- **During rush window:** Target is the lobby floor (floor 0) for all elevators
- **Outside rush window:** Elevators spread to evenly-distributed "home" floors. For `n` elevators across `k` floors: elevator `i` targets `round(i * (k-1) / (n-1))`

Example with 4 elevators, 10 floors: home floors are 0, 3, 6, 9.

### Door Mechanics

When an elevator serves a stop, its door opens for `DOOR_OPEN_DURATION_MS` (1000ms sim-time). While the door is open, the elevator cannot move. The door is closed automatically at the end of the tick when the duration expires.

### Capacity Enforcement

Elevators have a hard capacity limit (`elevatorCapacity: 8`). Enforcement happens at two levels:

1. **Assignment time** — The scheduler's `isEligible()` checks `projectedPassengers >= capacity` and rejects full elevators. Projected passengers = current passengers + number of scheduled pickup stops (conservative upper bound).

2. **Pickup time** — When `serveStop()` processes a pickup, it checks `passengers >= capacity` before each boarding. Overflow passengers are skipped: their dropoff stops are removed from the elevator's queue and their requests are unassigned back to the pending pool for retry.

### Request Generator (`simulation/requestGenerator.ts`)

`maybeEmitRequest(now)` is called every tick. It emits a new request when at least `requestFrequencyMs` of sim-time has elapsed since the last emission.

**Request profiles:**
- **During rush** (70% chance): Origin = lobby, destination = random upper floor
- **Normal**: Random origin and destination (guaranteed different)

**Backpressure:** If the pending queue has reached `maxPendingRequests` (100), the request is created with `rejectedAt` set and is not assigned to any elevator.

### State Management (`simulation/state.ts`)

All simulation state lives in module-level variables:

| State | Type | Description |
|-------|------|-------------|
| `elevators` | `Elevator[]` | All elevator instances |
| `requests` | `Request[]` | All requests (pending, assigned, completed, rejected) |
| `numFloors` | `number` | Current floor count |
| `numElevators` | `number` | Current elevator count |
| `simTimeMs` | `number` | Current simulation time |
| `speedMultiplier` | `number` | Time acceleration factor |
| `requestFrequencyMs` | `number` | Request generation interval |
| `isRunning` | `boolean` | Whether the simulation is advancing |

Key functions:

| Function | Purpose |
|----------|---------|
| `resetState()` | Restore all state to defaults, recreate elevators |
| `getPendingRequests()` | Returns unassigned, non-rejected requests |
| `getPendingCount()` | O(n) count of pending requests (used for backpressure check) |
| `drainCompleted(now, maxAge)` | Prune completed requests older than `maxAge` |
| `unassignRequest(id)` | Clear assignment fields so request re-enters pending pool |
| `assignRequestToElevator(id, elevId, pickup?, completion?)` | Set assignment and optional timing fields |

---

## Scheduler & Assignment

### Entry Point (`scheduler/index.ts`)

**`handleNewRequest(request, { now })`**

Called when a new request is generated. Finds the best elevator and assigns the request. Returns the elevator ID or `undefined` if no elevator is eligible.

**`retryPendingRequests(now)`**

Called every tick, but throttled to run every 2000ms of sim-time. Iterates over all pending (unassigned, non-rejected) requests and attempts to assign each one. This handles requests that initially had no eligible elevator.

### Eligibility (`scheduler/assignment.ts`)

`isEligible(elevator, request)` returns `true` if:

1. Elevator is not at capacity (`projectedPassengers < elevatorCapacity`)
2. AND one of:
   - Elevator is idle
   - Elevator is going the same direction and will pass the request's origin floor
   - Elevator is going the opposite direction and can reverse to reach the origin

### Scoring

`scoreElevator(elevator, request, { now, isRushWindow })` computes a score where **lower is better**:

```
score = estimatedWaitTime
      − starvationBoost
      − rushBias
      + utilizationPenalty
```

| Component | Formula | Effect |
|-----------|---------|--------|
| **Estimated wait** | `distance + stopsInWay * 2` | Penalizes far-away elevators and ones with many intermediate stops |
| **Starvation boost** | `1000` if request waited >= 30s, else `0` | Massively favors elevators for starved requests |
| **Rush bias** | Up to `90` points for lobby-origin, up-direction requests during rush | Favors elevators at/near the lobby with fewer stops |
| **Utilization penalty** | `passengers * 3 + stops * 2` | Spreads load across elevators |

### Stop Ordering — SCAN Algorithm (`scheduler/scheduling.ts`)

`reorderStops(elevator, options?)` sorts an elevator's stop queue using a modified SCAN (elevator) algorithm:

1. **Partition** stops into `up` (at or above current floor) and `down` (below current floor)
2. **Sort** each partition by floor (ascending for up, descending for down)
3. **Promote starved** pickups (waited >= 30s) to the front of their partition
4. **Concatenate**: serve all up-direction stops first, then down-direction

This ensures the elevator sweeps in one direction before reversing, minimizing unnecessary direction changes.

---

## Metrics

### Calculator (`metrics/calculator.ts`)

| Function | Returns | Formula |
|----------|---------|---------|
| `averageWaitTimeMs(requests)` | `number \| null` | Mean of `(pickupTime - timestamp)` for all picked-up requests |
| `maxWaitTimeMs(requests)` | `number \| null` | Max of `(pickupTime - timestamp)` |
| `averageTravelTimeMs(requests)` | `number \| null` | Mean of `(completionTime - pickupTime)` for completed requests |
| `utilizationPerElevator(elevators)` | `Record<string, number>` | `min((stops + passengers) / 10, 1)` per elevator — a 0–1 busyness ratio |
| `pendingCount(requests)` | `number` | Count of unassigned, non-rejected requests |
| `rejectedCount(requests)` | `number` | Count of requests rejected by backpressure |

---

## Key Algorithms

### 1. Elevator Assignment Flow

```
New request arrives
  │
  ├─ Pending queue full? ──yes──► Mark rejected, stop
  │
  ├─ Filter eligible elevators (direction + capacity)
  │   │
  │   ├─ None eligible? ──► Request stays pending (retried in 2s)
  │   │
  │   └─ Score each eligible elevator
  │       │
  │       └─ Pick lowest score ──► Add pickup + dropoff stops
  │                                 Reorder stops (SCAN)
  │                                 Set assignedElevatorId
  │
  └─ Done
```

### 2. Rush-Hour Behavior

During the rush window (sim-time 9:00:00–9:30:00):

| Mechanism | What it does |
|-----------|-------------|
| Request generation | 70% of requests are lobby → random upper floor |
| Idle pre-positioning | All idle elevators move to the lobby |
| Scoring rush bias | Elevators at/near lobby get up to 90-point bonus for lobby pickups |

### 3. Starvation Prevention

Requests waiting longer than 30s (sim-time) receive special treatment:

- **Scoring**: A `1000`-point boost effectively makes them highest priority
- **Stop ordering**: Starved pickups are promoted to the front of their direction partition

### 4. Backpressure & Stress Handling

| Mechanism | Trigger | Behavior |
|-----------|---------|----------|
| Queue cap | `pendingCount >= 100` | New requests are rejected (`rejectedAt` set) |
| Retry loop | Every 2s sim-time | All pending requests are re-attempted |
| Capacity overflow | Elevator full at pickup | Passengers that don't fit are unassigned back to pending |
| GC drain | Every 60s sim-time | Completed requests older than 120s are pruned from memory |
