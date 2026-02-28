"use strict";
// Default simulation config: n elevators, k floors, request frequency, rush window.
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaults = void 0;
exports.isRushWindow = isRushWindow;
exports.defaults = {
    numElevators: 4,
    numFloors: 10,
    requestFrequencyMs: 5000,
    rushLobbyFraction: 0.7,
    rushStartMs: 9 * 60 * 60 * 1000,
    rushDurationMs: 30 * 60 * 1000,
    starvationThresholdMs: 30000,
    lobbyFloor: 0,
};
function isRushWindow(now) {
    return (now >= exports.defaults.rushStartMs &&
        now < exports.defaults.rushStartMs + exports.defaults.rushDurationMs);
}
