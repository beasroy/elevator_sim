"use strict";
// Request generator: configurable n, k, frequency, rush profile.
// Random requests with timestamp, origin, destination; emits requests into state/scheduler.
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeEmitRequest = maybeEmitRequest;
exports.resetGenerator = resetGenerator;
const defaults_1 = require("../config/defaults");
const state_1 = require("./state");
const scheduler_1 = require("../scheduler");
let lastEmitSimTimeMs = -defaults_1.defaults.requestFrequencyMs;
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
// Create a new request with random origin/destination, or lobby→upper during rush.
function createRequest(now) {
    const numFloors = (0, state_1.getNumFloors)();
    const lobby = defaults_1.defaults.lobbyFloor;
    const isRush = (0, defaults_1.isRushWindow)(now);
    const useRushProfile = isRush && Math.random() < defaults_1.defaults.rushLobbyFraction;
    let originFloor;
    let destFloor;
    if (useRushProfile) {
        originFloor = lobby;
        destFloor = lobby + 1 <= numFloors - 1 ? randomInt(lobby + 1, numFloors - 1) : lobby;
        if (destFloor === originFloor && numFloors > 1) {
            destFloor = numFloors - 1;
        }
    }
    else {
        originFloor = randomInt(0, numFloors - 1);
        destFloor = randomInt(0, numFloors - 1);
        while (destFloor === originFloor) {
            destFloor = randomInt(0, numFloors - 1);
        }
    }
    const direction = destFloor > originFloor ? 'up' : 'down';
    const id = `req-${now}-${Math.random().toString(36).slice(2, 9)}`;
    return {
        id,
        timestamp: now,
        originFloor,
        destFloor,
        direction,
    };
}
// Maybe emit one new request if enough sim time has passed since last emit.
// Call from the simulation loop each tick. Adds request to state and assigns to an elevator.
function maybeEmitRequest(now) {
    if ((0, state_1.getNumFloors)() < 2)
        return;
    const frequencyMs = (0, state_1.getRequestFrequencyMs)();
    const elapsed = now - lastEmitSimTimeMs;
    if (elapsed < frequencyMs)
        return;
    lastEmitSimTimeMs = now;
    const request = createRequest(now);
    if (request.originFloor === request.destFloor)
        return;
    (0, state_1.addRequest)(request);
    (0, scheduler_1.handleNewRequest)(request, { now });
}
// Reset generator state (e.g. on simulation reset) so next emit uses frequency from now.
function resetGenerator() {
    lastEmitSimTimeMs = -(0, state_1.getRequestFrequencyMs)();
}
