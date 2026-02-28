"use strict";
// Compute: per-request wait/travel times, max wait, utilization per elevator.
Object.defineProperty(exports, "__esModule", { value: true });
exports.averageWaitTimeMs = averageWaitTimeMs;
exports.maxWaitTimeMs = maxWaitTimeMs;
exports.averageTravelTimeMs = averageTravelTimeMs;
exports.utilizationPerElevator = utilizationPerElevator;
function averageWaitTimeMs(requests) {
    const withPickup = requests.filter((r) => r.pickupTime != null);
    if (withPickup.length === 0)
        return null;
    const sum = withPickup.reduce((acc, r) => acc + (r.pickupTime - r.timestamp), 0);
    return sum / withPickup.length;
}
function maxWaitTimeMs(requests) {
    const withPickup = requests.filter((r) => r.pickupTime != null);
    if (withPickup.length === 0)
        return null;
    return Math.max(...withPickup.map((r) => r.pickupTime - r.timestamp));
}
function averageTravelTimeMs(requests) {
    const withCompletion = requests.filter((r) => r.completionTime != null && r.pickupTime != null);
    if (withCompletion.length === 0)
        return null;
    const sum = withCompletion.reduce((acc, r) => acc + (r.completionTime - r.pickupTime), 0);
    return sum / withCompletion.length;
}
function utilizationPerElevator(elevators) {
    const out = {};
    for (const e of elevators) {
        out[e.id] = { passengers: e.passengers, stopsCount: e.stops.length };
    }
    return out;
}
