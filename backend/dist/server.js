"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
const api_1 = require("./api");
const loop_1 = require("./simulation/loop");
const state_1 = require("./simulation/state");
const requestGenerator_1 = require("./simulation/requestGenerator");
dotenv_1.default.config();
(0, api_1.mountApi)(app_1.default);
(0, state_1.resetState)();
(0, requestGenerator_1.resetGenerator)();
const TICK_MS = 100;
setInterval(() => (0, loop_1.tick)(TICK_MS), TICK_MS);
const PORT = process.env.PORT ?? 3001;
app_1.default.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
