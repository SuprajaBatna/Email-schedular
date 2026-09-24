"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const slackController_1 = require("../controllers/slackController");
const router = (0, express_1.Router)();
router.get('/connect', slackController_1.connectSlack);
router.get('/callback', slackController_1.slackCallback);
exports.default = router;
