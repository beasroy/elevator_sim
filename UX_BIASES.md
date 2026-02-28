# UX Biases — Implementation Reference

This document explains every deliberate bias in the simulation that shapes the passenger experience. Each bias is expressed somewhere in the scoring formula, the stop-queue ordering, the request generator, or the idle-movement logic. The frontend surfaces all five biases in the **Scheduling Biases** panel (`BiasesInfo.tsx`).

---

## Table of Contents

1. [Lobby Rush Bias](#1-lobby-rush-bias)
2. [Starvation Escalation](#2-starvation-escalation)
3. [Utilization Balance](#3-utilization-balance)
4. [SCAN Directional Sweep](#4-scan-directional-sweep)
5. [Pre-positioning](#5-pre-positioning)
6. [How the Biases Interact](#6-how-the-biases-interact)
7. [Tunable Constants](#7-tunable-constants)

---

## 1. Lobby Rush Bias

### Intent

Model morning rush-hour behaviour: most passengers originate from the lobby (floor 0) and want to go up. Elevators should anticipate this and cluster near the lobby before the wave hits.

### Where it is implemented

#### 1a. Request generator — traffic shape (`requestGenerator.ts`)

```typescript
const useRushProfile = isRush && Math.random() < defaults.rushLobbyFraction;

if (useRushProfile) {
  originFloor = lobby; // always floor 0
  destFloor = randomInt(lobby + 1, numFloors - 1); // random upper floor
}
```

`rushLobbyFraction` (default `0.7`) means 70 % of requests during the rush window are forced to originate from the lobby and travel upward. The remaining 30 % are fully random. This creates an asymmetric traffic pattern rather than a uniform random one, directly increasing demand for lobby-side capacity.

**Rush window:** sim-time 09:00–09:30 (configured via `rushStartMs` and `rushDurationMs`).

#### 1b. Elevator scoring — `rushBias` (`assignment.ts`)

```typescript
function rushBias(elevator, request, isRush): number {
  if (
    !isRush ||
    request.originFloor !== defaults.lobbyFloor ||
    request.direction !== "up"
  )
    return 0;
  const atLobby = elevator.currentFloor === defaults.lobbyFloor ? 50 : 0;
  const nearLobby = elevator.currentFloor <= 1 ? 20 : 0;
  const fewerStops = Math.max(0, 20 - elevator.stops.length);
  return atLobby + nearLobby + fewerStops; // subtracted from score (lower = better)
}
```

During rush, lobby-origin upward requests apply a bonus of up to **−90** to the score of elevators that are already at or near the lobby and have few stops queued. This rewards elevators that pre-positioned correctly and have spare capacity, steering the assignment away from busy or remote elevators.

The three sub-bonuses are additive and independent:

| Sub-bonus    | Max value | Condition                                   |
| ------------ | --------- | ------------------------------------------- |
| `atLobby`    | 50        | Elevator is exactly at floor 0              |
| `nearLobby`  | 20        | Elevator is at floor 0 or 1                 |
| `fewerStops` | 20        | Awarded proportionally when stop count < 20 |

#### 1c. Idle pre-positioning — lobby override (`loop.ts`)

```typescript
const rush = isRushWindow(simNow) || isPreRushWindow(simNow);
const target = rush
  ? defaults.lobbyFloor
  : getHomeFloor(i, nElevators, nFloors);
```

During the rush window **and** the 10-second pre-rush lead-in, all idle elevators use floor 0 as their park target instead of their distributed home floor. This ensures that by the time the 09:00 request burst starts, the fleet has physically converged on the lobby.

### User experience effect

Passengers calling from the lobby during rush hour encounter shorter wait times. The combination of traffic shaping + score bonus + physical pre-positioning all reinforce the same direction.

---

## 2. Starvation Escalation

### Intent

Guarantee that no request waits indefinitely, even under sustained heavy load that would otherwise always favour newer, closer requests.

### Where it is implemented

#### 2a. Assignment scoring — `starvationBoost` (`assignment.ts`)

```typescript
function starvationBoost(request: Request, now: number): number {
  const waited = now - request.timestamp;
  if (waited >= defaults.starvationThresholdMs) return 1000; // subtracted from score
  return 0;
}
```

`starvationThresholdMs` = 30 000 ms (30 seconds of sim-time). Once a request exceeds this age, any elevator evaluating it receives a **−1000** bonus. Since typical `estimatedWaitTime` values are in the range 5–30, a −1000 term dominates the entire scoring formula and forces any eligible elevator to prefer this request above all others.

This is a hard step function rather than a gradual ramp — the bias is deliberately binary to ensure predictable promotion behaviour.

#### 2b. Stop-queue front-promotion — `promoteStarved` (`scheduling.ts`)

```typescript
const isStarved = isPickup && waited >= threshold;
if (isStarved) starved.push(stop);
else rest.push(stop);
// ...
return [...starved, ...rest]; // starved pickups sorted to front of their bucket
```

Called on every tick for every elevator via `reorderStops()`, this step scans the elevator's existing stop queue. Any pickup stop whose originating request has waited ≥ 30 s is moved to the **front** of its directional bucket (up or down), ahead of all non-starved stops. This prevents a freshly added lower-priority stop from leapfrogging a stale pickup that was already queued.

Without this, an elevator assigned to a starved request could still delay it by inserting newly scored stops ahead of it.

#### 2c. Retry loop — `retryPendingRequests` (`scheduler/index.ts`)

```typescript
const RETRY_INTERVAL_MS = 2000;

export function retryPendingRequests(now: number): void {
  if (now - lastRetrySimTimeMs < RETRY_INTERVAL_MS) return;
  // ... re-attempt assignRequest() for all pending unassigned requests
}
```

Requests that found no eligible elevator at creation time (e.g. all elevators moving in the wrong direction or all at capacity) are held in-state with `assignedElevatorId = null`. The retry loop runs every 2 000 ms of sim-time as part of each `tick()`, re-evaluating the same scoring formula including any grown starvation boost.

### User experience effect

No request is silently dropped. A request that was skipped over during a busy period will eventually force an elevator to divert. The 30-second threshold reflects the design intent: brief unfairness is acceptable; sustained wait beyond 30 seconds is not.

---

## 3. Utilization Balance

### Intent

Spread passenger load evenly across the elevator fleet. Avoid routing all requests to the single closest elevator while others sit idle.

### Where it is implemented

#### Assignment scoring — `utilizationPenalty` (`assignment.ts`)

```typescript
function utilizationPenalty(elevator: Elevator): number {
  return elevator.passengers * 3 + elevator.stops.length * 2;
}
```

This term is **added** to the score (higher = worse), directly counteracting the natural tendency of scoring to pick the closest elevator. Both components penalise load:

| Component               | Weight | Represents                                        |
| ----------------------- | ------ | ------------------------------------------------- |
| `elevator.passengers`   | ×3     | Current on-board passengers (confirmed load)      |
| `elevator.stops.length` | ×2     | Committed future work (queued pickups + dropoffs) |

Passengers are weighted higher than stops because a full car has a hard capacity ceiling; stops can be served and cleared.

#### Hard capacity gate — `isEligible` (`assignment.ts`)

```typescript
function projectedPassengers(elevator: Elevator): number {
  const futurePickups = elevator.stops.filter(
    (s) => s.type === "pickup",
  ).length;
  return elevator.passengers + futurePickups;
}

if (projectedPassengers(elevator) >= defaults.elevatorCapacity) return false;
```

Beyond soft-penalty load balancing, an elevator is entirely ineligible once its projected load (current passengers + queued pickups) meets `elevatorCapacity` (default 8). This is a hard UX guarantee: passengers are never assigned to an elevator that has no room for them.

### User experience effect

Under light load, the closest elevator still wins because its wait time term dominates. Under heavy load, the penalty steers assignments toward less-committed elevators, reducing the risk of a single elevator becoming a bottleneck while others are empty.

---

## 4. SCAN Directional Sweep

### Intent

Minimise unnecessary direction reversals. An elevator that reverses direction at every request wastes travel time for all passengers already on board.

### Where it is implemented

#### Stop ordering — `orderStopsForElevator` (`scheduling.ts`)

```typescript
const upSorted = promoteStarved(up, true); // ascending
const downSorted = promoteStarved(down, false); // descending
return [...upSorted, ...downSorted];
```

Every call to `reorderStops()` partitions the elevator's stops into an `up` bucket (floors ≥ current) and a `down` bucket (floors < current). Stops within each bucket are sorted in the direction of travel. The final queue always processes the current-direction set first, then reverses.

#### Eligibility — directional coherence (`assignment.ts`)

The `isEligible()` function enforces that a new request is only assigned to an elevator whose current trajectory is compatible with serving it **without an extra reversal**:

```typescript
if (reqDir === "up") {
  if (direction === "up") return currentFloor <= origin; // will pass through
  if (direction === "down") return currentFloor > origin; // will reach it on return sweep
}
```

An ineligible assignment would mean the elevator must reverse mid-sweep to serve a new request, degrading service for all passengers already on board.

### User experience effect

Passengers on board experience fewer direction changes and more predictable journey times. Each floor is visited at most once per up/down sweep, giving an O(numFloors) worst-case wait per cycle.

---

## 5. Pre-positioning

### Intent

Ensure idle elevators are distributed across the building so that the average distance to any incoming request is minimised, rather than having all idle elevators pile up on one floor.

### Where it is implemented

#### Home floor formula — `getHomeFloor` (`loop.ts`)

```typescript
export function getHomeFloor(elevatorIndex, numElevators, numFloors): number {
  if (numElevators <= 1) return Math.floor((numFloors - 1) / 2);
  return Math.round((elevatorIndex * (numFloors - 1)) / (numElevators - 1));
}
```

This distributes elevators evenly across the floor range. For 4 elevators across 10 floors:

| Elevator index | Home floor |
| -------------- | ---------- |
| 0              | 0          |
| 1              | 3          |
| 2              | 6          |
| 3              | 9          |

The formula guarantees the first elevator is always at the bottom and the last at the top, with others interpolated linearly.

#### Movement toward home — `prePositionIdle` (`loop.ts`)

```typescript
function prePositionIdle(elevator: Elevator, targetFloor: number): void {
  if (elevator.currentFloor === targetFloor) {
    elevator.direction = "idle";
    return;
  }
  elevator.direction = elevator.currentFloor > targetFloor ? "down" : "up";
  elevator.currentFloor += elevator.currentFloor > targetFloor ? -1 : 1;
}
```

This is called only when `elevator.stops` is empty. The elevator moves one floor per tick toward its home (or lobby during rush). As soon as a new stop is assigned, `processElevatorTick` routes to `moveToward` instead, and pre-positioning is interrupted.

#### Initial placement — `createElevator` (`state.ts`)

```typescript
function createElevator(id: string, index: number): Elevator {
  return {
    currentFloor: homeFloor(index, numElevators, numFloors),
    // ...
  };
}
```

Elevators spawn at their home floor on `resetState()` or `initElevators()`, so the fleet is already distributed at simulation start without needing to move first.

### User experience effect

Passengers calling from any floor have a higher chance of finding a nearby idle elevator, rather than waiting for all elevators to return from a far end of the building. During rush, the lobby override concentrates capacity exactly where the incoming demand will be.

---

## 6. How the Biases Interact

The biases are not independent — they interact and sometimes conflict. The table below shows the priority order under different conditions.

| Condition                     | Dominant bias                           | Secondary bias                         |
| ----------------------------- | --------------------------------------- | -------------------------------------- |
| Request age > 30 s            | Starvation escalation (−1000 score)     | Overrides all other scoring            |
| Rush window + lobby origin    | Rush bias (up to −90) + pre-positioning | Utilization balance (additive penalty) |
| High fleet load               | Utilization balance (+penalty)          | Capacity gate (hard ineligibility)     |
| Idle elevator, normal traffic | Pre-positioning (home floor movement)   | SCAN order (on next assignment)        |
| New request, normal traffic   | Estimated wait time (minimum distance)  | Utilization balance (tie-break)        |

The starvation boost is intentionally stronger than all other terms combined, so the fairness guarantee is never overridden by rush-hour biases or distance optimisations.

---

## 7. Tunable Constants

All bias-controlling constants live in [src/config/defaults.ts](src/config/defaults.ts) and can be changed without touching any algorithm logic.

| Constant                | Default              | Controls                                                    |
| ----------------------- | -------------------- | ----------------------------------------------------------- |
| `rushLobbyFraction`     | `0.7`                | Fraction of rush-hour requests that use the lobby profile   |
| `rushStartMs`           | `9 * 60 * 60 * 1000` | Sim-time when rush hour begins (09:00)                      |
| `rushDurationMs`        | `30 * 60 * 1000`     | Duration of rush window (30 minutes)                        |
| `preRushLeadMs`         | `10_000`             | How many sim-ms before rush elevators start moving to lobby |
| `starvationThresholdMs` | `30_000`             | Sim-ms a request waits before escalation triggers           |
| `elevatorCapacity`      | `8`                  | Hard passenger cap per elevator                             |
| `maxPendingRequests`    | `100`                | Cap on unassigned requests before new ones are rejected     |
| `lobbyFloor`            | `0`                  | Floor index treated as the lobby / rush-hour origin         |

The four scoring weights (`distance`, `stopsInWay × 2`, `passengers × 3`, `stops × 2`, rush sub-bonuses) are embedded directly in the scoring functions in [src/scheduler/assignment.ts](src/scheduler/assignment.ts) and would require code changes to tune.
