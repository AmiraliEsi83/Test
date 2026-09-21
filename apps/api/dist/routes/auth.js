"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_js_1 = require("../db/client.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.post('/signup', async (req, res) => {
    try {
        const { email, password, name, plan = 'TRADER' } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Name, email and password are required.' });
        }
        const existing = await client_js_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const user = await client_js_1.prisma.user.create({
            data: {
                email,
                name,
                passwordHash,
                subscriptionTier: plan,
                subscriptions: {
                    create: {
                        plan,
                        status: 'ACTIVE',
                        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    },
                },
            },
        });
        const token = (0, auth_js_1.generateToken)({
            id: user.id,
            email: user.email,
            name: user.name,
            subscriptionTier: user.subscriptionTier,
        });
        await client_js_1.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'USER_SIGNUP',
                category: 'AUTH',
                details: `New account registered: ${user.email} (${user.subscriptionTier})`,
                level: 'INFO',
                ip: req.ip,
            },
        });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                subscriptionTier: user.subscriptionTier,
                createdAt: user.createdAt,
            },
            token,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        const user = await client_js_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const token = (0, auth_js_1.generateToken)({
            id: user.id,
            email: user.email,
            name: user.name,
            subscriptionTier: user.subscriptionTier,
        });
        await client_js_1.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'USER_LOGIN',
                category: 'AUTH',
                details: `Successful login for ${user.email}`,
                level: 'INFO',
                ip: req.ip,
            },
        });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                subscriptionTier: user.subscriptionTier,
                createdAt: user.createdAt,
            },
            token,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/me', auth_js_1.requireAuth, async (req, res) => {
    try {
        const user = await client_js_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                subscriptionTier: true,
                createdAt: true,
            },
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    // Professional security response: generic success to prevent email enumeration
    res.json({
        message: `If an account with ${email} exists, password reset instructions have been dispatched.`,
    });
});
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully.' });
});
exports.default = router;
