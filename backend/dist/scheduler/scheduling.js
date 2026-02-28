"use strict";
//Scheduling step: direction-aware queues (SCAN), priority overrides (e.g. 30s escalation).
Object.defineProperty(exports, "__esModule", { value: true });
exports.partitionStops = partitionStops;
exports.orderStopsForElevator = orderStopsForElevator;
exports.reorderStops = reorderStops;
const defaults_1 = require("../config/defaults");
function partitionStops(elevator) {
    const current = elevator.currentFloor;
    const up = [];
    const down = [];
    for (const stop of elevator.stops) {
        if (stop.floor >= current)
            up.push(stop);
        else
            down.push(stop);
    }
    return { up, down };
}
function orderStopsForElevator(elevator, options) {
    const { up, down } = partitionStops(elevator);
    const threshold = defaults_1.defaults.starvationThresholdMs;
    const promoteStarved = (stops, ascending) => {
        const opts = options;
        const hasOverride = opts?.getRequestTimestamp != null && opts?.now != null;
        if (hasOverride) {
            const now = opts.now;
            const getTs = opts.getRequestTimestamp;
            const starved = [];
            const rest = [];
            for (const stop of stops) {
                const isPickup = stop.type === 'pickup';
                const requestId = stop.requestIds[0];
                const ts = requestId ? getTs(requestId) : undefined;
                const waited = ts === undefined ? 0 : now - ts;
                const isStarved = isPickup && waited >= threshold;
                if (isStarved)
                    starved.push(stop);
                else
                    rest.push(stop);
            }
            rest.sort((a, b) => (ascending ? a.floor - b.floor : b.floor - a.floor));
            starved.sort((a, b) => (ascending ? a.floor - b.floor : b.floor - a.floor));
            return [...starved, ...rest];
        }
        return stops.sort((a, b) => (ascending ? a.floor - b.floor : b.floor - a.floor));
    };
    const upSorted = promoteStarved(up, true);
    const downSorted = promoteStarved(down, false);
    return [...upSorted, ...downSorted];
}
function reorderStops(elevator, options) {
    elevator.stops = orderStopsForElevator(elevator, options);
}
