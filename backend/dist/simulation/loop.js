"use strict";
// Time-based simulation loop: tick, move elevators, open/close doors, update positions, serve stops.
Object.defineProperty(exports, "__esModule", { value: true });
exports.tick = tick;
const state_1 = require("./state");
const scheduling_1 = require("../scheduler/scheduling");
const requestGenerator_1 = require("./requestGenerator");
// Simulation ms per floor travel (elevator moves 1 floor per FLOOR_MS).
const FLOOR_MS = 1000;
// Advance simulation by deltaMs (wall-clock). Only runs when isRunning.
// Updates sim time, reorders stops (30s override), moves elevators, serves stops.
function tick(deltaMs) {
    if (!(0, state_1.getIsRunning)())
        return;
    const speed = (0, state_1.getSpeedMultiplier)();
    const now = (0, state_1.getSimTimeMs)();
    const travelBudget = deltaMs * speed;
    (0, state_1.setSimTimeMs)(now + travelBudget);
    (0, requestGenerator_1.maybeEmitRequest)((0, state_1.getSimTimeMs)());
    const elevators = (0, state_1.getElevators)();
    const getRequestTimestamp = (id) => (0, state_1.getRequestById)(id)?.timestamp;
    for (const elevator of elevators) {
        (0, scheduling_1.reorderStops)(elevator, {
            now,
            getRequestTimestamp,
        });
    }
    const steps = Math.floor(travelBudget / FLOOR_MS);
    for (let step = 0; step < steps; step++) {
        const stepTime = now + (step + 1) * FLOOR_MS;
        for (const elevator of elevators) {
            processElevatorTick(elevator, stepTime);
        }
    }
    for (const elevator of elevators) {
        elevator.doorOpen = false;
    }
}
function processElevatorTick(elevator, now) {
    const next = elevator.stops[0];
    if (!next) {
        elevator.direction = 'idle';
        return;
    }
    const current = elevator.currentFloor;
    if (current < next.floor) {
        elevator.direction = 'up';
        elevator.currentFloor = current + 1;
        if (elevator.currentFloor === next.floor) {
            serveStop(elevator, next, now);
        }
        return;
    }
    if (current > next.floor) {
        elevator.direction = 'down';
        elevator.currentFloor = current - 1;
        if (elevator.currentFloor === next.floor) {
            serveStop(elevator, next, now);
        }
        return;
    }
    serveStop(elevator, next, now);
}
function serveStop(elevator, stop, now) {
    elevator.doorOpen = true;
    for (const requestId of stop.requestIds) {
        if (stop.type === 'pickup') {
            elevator.passengers += 1;
            (0, state_1.assignRequestToElevator)(requestId, elevator.id, now);
        }
        else {
            elevator.passengers -= 1;
            (0, state_1.assignRequestToElevator)(requestId, elevator.id, undefined, now);
        }
    }
    elevator.stops.shift();
}
