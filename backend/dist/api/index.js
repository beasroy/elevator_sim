"use strict";
// Mount API routes on the Express app.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountApi = mountApi;
const controls_1 = __importDefault(require("./routes/controls"));
const metrics_1 = __importDefault(require("./routes/metrics"));
function mountApi(app) {
    app.use('/api/controls', controls_1.default);
    app.use('/api/metrics', metrics_1.default);
}
