"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const api_1 = require("@bull-board/api");
const bullMQAdapter_1 = require("@bull-board/api/bullMQAdapter");
const express_2 = require("@bull-board/express");
const emailRoutes_1 = __importDefault(require("./routes/emailRoutes"));
const slackRoutes_1 = __importDefault(require("./routes/slackRoutes"));
const emailQueue_1 = require("./queues/emailQueue");
const elasticsearch_1 = require("./config/elasticsearch");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize Elasticsearch Index
(0, elasticsearch_1.initializeElasticsearchIndex)();
// Setup verification health endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
// Configure Bull Board queue dashboard at /admin/queues
const serverAdapter = new express_2.ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
(0, api_1.createBullBoard)({
    queues: [new bullMQAdapter_1.BullMQAdapter(emailQueue_1.emailQueue)],
    serverAdapter: serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());
const emailController_1 = require("./controllers/emailController");
// API Routes
app.use('/api/emails', emailRoutes_1.default);
app.use('/api/slack', slackRoutes_1.default);
app.get('/api/senders', emailController_1.getSendersController);
exports.default = app;
