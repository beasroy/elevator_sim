"use strict";
// In-memory state: elevators[], requests[]; getters/setters for API and simulation loop.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getElevators = getElevators;
exports.getRequests = getRequests;
exports.getPendingRequests = getPendingRequests;
exports.getNumFloors = getNumFloors;
exports.getNumElevators = getNumElevators;
exports.setNumFloors = setNumFloors;
exports.setNumElevators = setNumElevators;
exports.getSimTimeMs = getSimTimeMs;
exports.setSimTimeMs = setSimTimeMs;
exports.getSpeedMultiplier = getSpeedMultiplier;
exports.setSpeedMultiplier = setSpeedMultiplier;
exports.getRequestFrequencyMs = getRequestFrequencyMs;
exports.setRequestFrequencyMs = setRequestFrequencyMs;
exports.getIsRunning = getIsRunning;
exports.setIsRunning = setIsRunning;
exports.resetState = resetState;
exports.initElevators = initElevators;
exports.addRequest = addRequest;
exports.getRequestById = getRequestById;
exports.addStopsToElevator = addStopsToElevator;
exports.assignRequestToElevator = assignRequestToElevator;
exports.getElevatorById = getElevatorById;
const defaults_1 = require("../config/defaults");
let elevators = [];
let requests = [];
let numFloors = defaults_1.defaults.numFloors;
let numElevators = defaults_1.defaults.numElevators;
let simTimeMs = 0;
let speedMultiplier = 1;
let requestFrequencyMs = defaults_1.defaults.requestFrequencyMs;
let isRunning = false;
function createElevator(id) {
    return {
        id,
        currentFloor: 0,
        direction: 'idle',
        doorOpen: false,
        passengers: 0,
        stops: [],
    };
}
function getElevators() {
    return elevators;
}
function getRequests() {
    return requests;
}
/** Unassigned requests (no assignedElevatorId). */
function getPendingRequests() {
    return requests.filter((r) => r.assignedElevatorId == null);
}
function getNumFloors() {
    return numFloors;
}
function getNumElevators() {
    return numElevators;
}
function setNumFloors(n) {
    numFloors = n;
}
function setNumElevators(n) {
    numElevators = n;
}
function getSimTimeMs() {
    return simTimeMs;
}
function setSimTimeMs(ms) {
    simTimeMs = ms;
}
function getSpeedMultiplier() {
    return speedMultiplier;
}
function setSpeedMultiplier(speed) {
    speedMultiplier = speed;
}
function getRequestFrequencyMs() {
    return requestFrequencyMs;
}
function setRequestFrequencyMs(ms) {
    requestFrequencyMs = ms;
}
function getIsRunning() {
    return isRunning;
}
function setIsRunning(running) {
    isRunning = running;
}
/** Reset state and create n elevators, for start/reset. */
function resetState() {
    numFloors = defaults_1.defaults.numFloors;
    numElevators = defaults_1.defaults.numElevators;
    requestFrequencyMs = defaults_1.defaults.requestFrequencyMs;
    requests = [];
    simTimeMs = 0;
    isRunning = false;
    elevators = Array.from({ length: numElevators }, (_, i) => createElevator(`elevator-${i}`));
}
/** Initialize elevators only (e.g. after config change). */
function initElevators() {
    elevators = Array.from({ length: numElevators }, (_, i) => createElevator(`elevator-${i}`));
}
function addRequest(request) {
    requests.push(request);
}
function getRequestById(id) {
    return requests.find((r) => r.id === id);
}
// Assign request to elevator by adding pickup and dropoff stops. Caller (scheduler) provides the stops to add.
function addStopsToElevator(elevatorId, newStops) {
    const elevator = elevators.find((e) => e.id === elevatorId);
    if (!elevator)
        return;
    elevator.stops.push(...newStops);
}
// Set request's assigned elevator and optionally pickup/completion times.
function assignRequestToElevator(requestId, elevatorId, pickupTime, completionTime) {
    const request = requests.find((r) => r.id === requestId);
    if (!request)
        return;
    request.assignedElevatorId = elevatorId;
    if (pickupTime != null)
        request.pickupTime = pickupTime;
    if (completionTime != null)
        request.completionTime = completionTime;
}
function getElevatorById(id) {
    return elevators.find((e) => e.id === id);
}
