"use strict";
// call assignment then scheduling; single API for "handle new request".
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderStops = exports.partitionStops = exports.orderStopsForElevator = exports.scoreElevator = exports.isEligible = exports.chooseElevator = exports.assignRequest = void 0;
exports.handleNewRequest = handleNewRequest;
const assignment_1 = require("./assignment");
const state_1 = require("../simulation/state");
const defaults_1 = require("../config/defaults");
/**
 * Handle a new floor request: assign to best elevator and insert pickup/dropoff in SCAN order.
 * Mutates state (elevators and request). Returns the assigned elevator id or undefined.
 */
function handleNewRequest(request, options) {
    const elevators = (0, state_1.getElevators)();
    const elevator = (0, assignment_1.assignRequest)(elevators, request, {
        now: options.now,
        isRushWindow: (0, defaults_1.isRushWindow)(options.now),
    });
    return elevator?.id;
}
var assignment_2 = require("./assignment");
Object.defineProperty(exports, "assignRequest", { enumerable: true, get: function () { return assignment_2.assignRequest; } });
Object.defineProperty(exports, "chooseElevator", { enumerable: true, get: function () { return assignment_2.chooseElevator; } });
Object.defineProperty(exports, "isEligible", { enumerable: true, get: function () { return assignment_2.isEligible; } });
Object.defineProperty(exports, "scoreElevator", { enumerable: true, get: function () { return assignment_2.scoreElevator; } });
var scheduling_1 = require("./scheduling");
Object.defineProperty(exports, "orderStopsForElevator", { enumerable: true, get: function () { return scheduling_1.orderStopsForElevator; } });
Object.defineProperty(exports, "partitionStops", { enumerable: true, get: function () { return scheduling_1.partitionStops; } });
Object.defineProperty(exports, "reorderStops", { enumerable: true, get: function () { return scheduling_1.reorderStops; } });
