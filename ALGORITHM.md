# Algorithm Design & Trade-offs

## Overview

The backend uses a layered, multi-concern scheduling system built on top of the classic **SCAN (elevator) algorithm**. Rather than a single monolithic scheduler, the logic is split across three concerns:

1. **Assignment** — which elevator should serve a new request
2. **Scheduling** — in what order should a chosen elevator visit its stops
3. **Loop** — when and how the simulation advances time and triggers movement

---

## 1. Base Algorithm: SCAN (Elevator Algorithm)

### How it works in this codebase

SCAN is implemented inside `orderStopsForElevator()` in [src/scheduler/scheduling.ts](src/scheduler/scheduling.ts).

When an elevator's stop queue is reordered, all stops are first **partitioned** by floor relative to the elevator's current position:

- Stops **at or above** `currentFloor` → `up` bucket, sorted ascending
- Stops **below** `currentFloor` → `down` bucket, sorted descending

The final queue is always `[...upSorted, ...downSorted]` — i.e., sweep up first, then sweep down. This is pure SCAN: the elevator travels in one direction until it runs out of stops in that direction, then reverses.

```
currentFloor = 4, stops at [2, 6, 9, 1]

up   → [6, 9]   → sorted ascending  → [6, 9]
down → [2, 1]   → sorted descending → [2, 1]

Final queue: [6, 9, 2, 1]
```

### Why SCAN?

| Property                      | SCAN behaviour                                                        |
| ----------------------------- | --------------------------------------------------------------------- |
| Bounded worst-case wait       | Each floor is visited at most once per sweep — O(numFloors) per cycle |
| Directional coherence         | Avoids the thrashing of pure FCFS (First-Come First-Served)           |
| Easy to insert new stops      | New stops slot naturally into the appropriate sorted bucket           |
| Low implementation complexity | Two sorted lists + concatenation                                      |

### Trade-offs

| Pro                                                                    | Con                                                                     |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Low average wait under moderate load                                   | End-of-sweep floors always wait longer than mid-sweep floors            |
| Naturally groups nearby stops (fewer door-open events per floor block) | Does not optimise for minimising total travel distance (NP-hard)        |
| Deterministic ordering given the same stops                            | No lookahead — cannot reason about stops that haven't been assigned yet |

---

## 2. Elevator Assignment: Scored Selection

### How it works

Defined in [src/scheduler/assignment.ts](src/scheduler/assignment.ts). When a new request arrives, `chooseElevator()` runs a two-phase selection:

**Phase 1 — Eligibility filter (`isEligible`)**

An elevator is **ineligible** if:

- Its projected passenger count (current + future pickups in queue) meets `elevatorCapacity` (default 8)
- Its current direction would cause it to _pass_ the request floor before it could serve it

Direction eligibility rules:

| Elevator direction | Request direction | Eligible when                                       |
| ------------------ | ----------------- | --------------------------------------------------- |
| `idle`             | any               | always                                              |
| `up`               | `up`              | elevator is at or below origin floor                |
| `up`               | `down`            | elevator is above origin floor (will reverse first) |
| `down`             | `down`            | elevator is at or above origin floor                |
| `down`             | `up`              | elevator is below origin floor (will reverse first) |

This prevents an elevator from picking up a passenger it will overshoot.

**Phase 2 — Scoring (lower = better)**

```
score = estimatedWaitTime
      - starvationBoost
      - rushBias
      + utilizationPenalty
```

| Component            | Formula                                           | Rationale                                                                                            |
| -------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `estimatedWaitTime`  | `distance + (stops_in_way × 2)`                   | Approximates floors-until-arrival; the ×2 penalty models door open/close delay per intermediate stop |
| `starvationBoost`    | `-1000` if waited ≥ 30 s                          | Dominant negative term; forces stale requests to the front of any elevator's preference              |
| `rushBias`           | Up to `-90` for lobby-origin requests during rush | Rewards elevators already at or near the lobby during the AM rush window                             |
| `utilizationPenalty` | `passengers × 3 + stops × 2`                      | Spreads load by penalising busy elevators                                                            |

### Trade-offs

| Decision                                      | Rationale                                             | Trade-off                                                                                       |
| --------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Heuristic scoring instead of optimal dispatch | O(E) per request (E = elevator count); trivially fast | Not globally optimal — a heavily penalised elevator might still be the best overall choice      |
| Fixed weight constants                        | Simple to reason about and tune                       | Weights do not adapt to traffic density; may need manual tuning for different building profiles |
| Eligibility before scoring                    | Eliminates a class of wasted assignments early        | An ineligible elevator is never scored, even if it would become eligible soon                   |
| Projected capacity check                      | Prevents over-committing stops to a full elevator     | Does not account for multi-stop drop-offs that will free capacity before the new pickup         |

---

## 3. Starvation Prevention

### The problem

Pure SCAN with scored assignment can starve a request if all nearby elevators are perpetually scored as better candidates for newer requests, leaving old requests stranded in the `pending` pool.

### Two-part solution

**Part 1 — Assignment scoring (`starvationBoost` in `assignment.ts`)**

If a request has waited ≥ `starvationThresholdMs` (30 s sim-time) at the time of assignment, a `-1000` bonus is subtracted from the elevator's score. Because typical `estimatedWaitTime` values are in the range of 5–30, a value of `-1000` effectively overrides all other score components and forces the assignment.

**Part 2 — Stop queue promotion (`promoteStarved` in `scheduling.ts`)**

On every `reorderStops()` call (which runs every tick for every elevator), pickup stops are inspected for starvation. Starved pickups are **front-sorted within their directional bucket**, ahead of non-starved stops:

```
up bucket (normal): [floor 5, floor 8]
up bucket (with starved floor 7): [floor 7★, floor 5, floor 8]
```

This guarantees that even after assignment, a stale pickup will not be blocked by a later-added, lower-floor stop.

**Part 3 — Retry loop (`retryPendingRequests` in `scheduler/index.ts`)**

Requests that could not be assigned at creation time (all elevators ineligible or at capacity) are not dropped — they are held in `state.requests` with `assignedElevatorId = null`. A throttled retry runs every 2 000 ms of sim-time and re-attempts assignment for all pending requests.

### Trade-offs

| Decision                                         | Rationale                                    | Trade-off                                                                                                                       |
| ------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Hard `-1000` boost rather than time-proportional | Guarantees promotion regardless of traffic   | Could cause a suboptimal elevator to be chosen (e.g. one that is far away), temporarily degrading throughput for fresh requests |
| Threshold is a single global constant (30 s)     | Easy to reason about                         | Does not differentiate by request priority or building zone                                                                     |
| Retry is throttled at 2 000 ms                   | Prevents tight-loop retries on a full system | A request could wait up to 2 000 ms extra after a slot opens before being assigned                                              |

---

## 4. Idle Pre-Positioning

### How it works

Implemented in `processElevatorTick()` and `prePositionIdle()` in [src/simulation/loop.ts](src/simulation/loop.ts), with `getHomeFloor()` computing the target.

When an elevator has **no pending stops**, rather than sitting still it moves toward a **home floor** derived from its index:

```
homeFloor(i) = round( i × (numFloors - 1) / (numElevators - 1) )
```

For 4 elevators across 10 floors this gives home floors: `0, 3, 6, 9` — evenly distributed across the building.

**Rush / pre-rush override:** During the AM rush window (and the 10 s lead-in before it), `idleTargetFloor` is overridden to `lobbyFloor` (floor 0) for all elevators, pre-positioning the fleet at the lobby in anticipation of the burst of upward requests.

### Trade-offs

| Decision                           | Rationale                                                               | Trade-off                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Even distribution by index formula | Minimises expected distance to any random request under uniform traffic | Positioning is static — does not adapt to observed traffic patterns                                                |
| Rush pre-positioning to lobby      | Measurably reduces wait time on the first wave of rush-hour requests    | All elevators cluster at floor 0; a request from a high floor during rush onset will wait much longer than average |
| Pre-rush lead window (10 s)        | Ensures elevators have time to reach the lobby before the rush burst    | Lead time is a fixed constant, not computed from actual elevator positions                                         |

---

## 5. Capacity Overflow Handling

### How it works

In `serveStop()` ([src/simulation/loop.ts](src/simulation/loop.ts)), when an elevator opens its doors at a pickup stop and `elevator.passengers >= elevatorCapacity`, passengers that cannot board are captured as `overflowIds`. Their corresponding stops are scrubbed from the elevator's queue, and `unassignRequest()` returns them to the `pending` pool.

The next `retryPendingRequests()` cycle will re-assign them.

### Trade-offs

| Decision                                               | Rationale                                                                                                  | Trade-off                                                                                                                             |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Evict at serve-time rather than prevent at assign-time | Assignment uses _projected_ capacity (current + future pickups), which can race with concurrent tick steps | Passengers can be unloaded and overflow can occur in the same tick, so projected capacity is never perfectly accurate under high load |
| Overflowed requests rejoin pending pool                | Ensures no request is silently dropped                                                                     | The request loses its original taxi and must restart the wait, inflating `averageWaitTimeMs`                                          |

---

## 6. Tick Loop & Time Mechanics

### How it works

`tick(deltaMs)` in [src/simulation/loop.ts](src/simulation/loop.ts) is called every 100 ms of wall-clock time by `setInterval`.

```
simTime += deltaMs × speedMultiplier
travelAccumulator += deltaMs × speedMultiplier
steps = floor(travelAccumulator / FLOOR_MS)   // FLOOR_MS = 1000
```

Elevators move **1 floor per 1 000 ms of sim-time**. The accumulator pattern avoids floor-movement jitter at non-integer speed multipliers (e.g. `×1.5` gives a fractional floor movement per tick that carries over to the next).

Each movement step has its own simulated timestamp (`now + (step + 1) × FLOOR_MS`), so overlapping steps are resolved in order rather than collapsing to a single instant.

### Trade-offs

| Decision                                                        | Rationale                                                     | Trade-off                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Fixed `FLOOR_MS = 1000`                                         | Simple, predictable travel speed                              | Not configurable at runtime; different building profiles (high-rise vs. low-rise) cannot adjust travel speed |
| `speedMultiplier` scales sim-time not wall-time                 | Allows fast-forward simulation without changing polling rates | Very high multipliers (> 10×) can produce many steps per tick, increasing per-tick CPU cost                  |
| Door open duration is wall-clock-linked via `doorOpenUntil` map | Doors close after a real 1 000 ms even at high speed          | At high speed multipliers, door open time in sim-time is tiny, which affects passenger boarding realism      |

---

## 7. Request Generation & Rush Profile

### How it works

`maybeEmitRequest()` in [src/simulation/requestGenerator.ts](src/simulation/requestGenerator.ts) emits at most one request per `requestFrequencyMs` of sim-time. During the **rush window** (09:00–09:30 sim-time), 70% of requests use the rush profile: origin = lobby, destination = random upper floor. The remaining 30% (and all off-peak requests) are fully random origin/destination pairs.

A hard cap of `maxPendingRequests = 100` prevents unbounded queue growth: requests beyond the cap are immediately marked `rejectedAt` and counted in metrics.

### Trade-offs

| Decision                               | Rationale                                | Trade-off                                                                                        |
| -------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| One request per frequency tick         | Simple, predictable generation           | Does not model burst arrivals (e.g. a lift lobby filling instantaneously after a meeting ends)   |
| Fixed `rushLobbyFraction = 0.7`        | Easily observable bias for demonstration | Real morning rush traffic is neither perfectly timed nor perfectly biased                        |
| Hard rejection at `maxPendingRequests` | Bounds state array growth                | Rejection inflates `rejectedCount` metrics and can mask scheduling bottlenecks as a data problem |

---

## Summary: Key Algorithmic Decisions

| Concern               | Algorithm used                                          | Complexity                                        |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| Stop ordering         | SCAN with directional partitioning                      | O(S log S) per elevator per tick (S = stop count) |
| Elevator selection    | Heuristic scoring over eligible candidates              | O(E × S) per request                              |
| Starvation prevention | Score override + queue front-promotion + retry loop     | O(E × S) per tick                                 |
| Idle parking          | Static even-distribution formula + rush override        | O(1) per elevator per tick                        |
| Capacity enforcement  | Projected count at assign-time + eviction at serve-time | O(S) at assign; O(S) at serve                     |
| Time advancement      | Accumulator-based discrete step simulation              | O(steps × E) per tick                             |
