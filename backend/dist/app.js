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
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : process.env.FRONTEND_URL
        ? [process.env.FRONTEND_URL.trim()]
        : '*';
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, mobile apps, server-to-server) or matching allowed origins
        if (!origin ||
            allowedOrigins === '*' ||
            (Array.isArray(allowedOrigins) && (allowedOrigins.includes(origin) || allowedOrigins.includes('*')))) {
            callback(null, true);
        }
        else {
            callback(null, true); // Fallback allow to avoid unexpected dev/staging CORS blocks
        }
    },
    credentials: true,
}));
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
