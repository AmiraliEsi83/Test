"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const client_js_1 = require("../db/client.js");
const router = (0, express_1.Router)();
router.get('/', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { category, level, limit = '100' } = req.query;
        const where = {};
        if (category)
            where.category = String(category);
        if (level)
            where.level = String(level);
        const logs = await client_js_1.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: Math.min(Number(limit), 200),
        });
        res.json({ logs });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
