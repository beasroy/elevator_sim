"use strict";
// REST: start, stop, reset; set n, k, frequency, speed (time multiplier).
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const state_1 = require("../../simulation/state");
const requestGenerator_1 = require("../../simulation/requestGenerator");
const router = (0, express_1.Router)();
router.post('/start', (_req, res) => {
    (0, state_1.setIsRunning)(true);
    res.json({ ok: true, running: true });
});
router.post('/stop', (_req, res) => {
    (0, state_1.setIsRunning)(false);
    res.json({ ok: true, running: false });
});
router.post('/reset', (_req, res) => {
    (0, state_1.resetState)();
    (0, requestGenerator_1.resetGenerator)();
    res.json({ ok: true });
});
router.post('/config', (req, res) => {
    const body = req.body ?? {};
    if (typeof body.numFloors === 'number')
        (0, state_1.setNumFloors)(body.numFloors);
    if (typeof body.numElevators === 'number')
        (0, state_1.setNumElevators)(body.numElevators);
    if (typeof body.speed === 'number')
        (0, state_1.setSpeedMultiplier)(body.speed);
    const freq = body.requestFrequencyMs ?? body.frequency;
    if (typeof freq === 'number' && freq > 0)
        (0, state_1.setRequestFrequencyMs)(freq);
    (0, state_1.initElevators)();
    res.json({ ok: true });
});
exports.default = router;
