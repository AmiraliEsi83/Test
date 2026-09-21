"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shared_1 = require("@harsi/shared");
const auth_js_1 = require("../middleware/auth.js");
const client_js_1 = require("../db/client.js");
const auth_js_2 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.get('/plans', (req, res) => {
    res.json({ plans: shared_1.SUBSCRIPTION_PLANS });
});
router.get('/current', auth_js_1.requireAuth, async (req, res) => {
    try {
        const user = await client_js_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const tier = user.subscriptionTier || 'FREE';
        const planDetails = shared_1.SUBSCRIPTION_PLANS[tier] || shared_1.SUBSCRIPTION_PLANS.FREE;
        res.json({
            tier,
            details: planDetails,
            subscription: user.subscriptions[0] || null,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/upgrade', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { plan } = req.body;
        if (!['FREE', 'TRADER', 'PRO'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }
        const updatedUser = await client_js_1.prisma.user.update({
            where: { id: req.user.id },
            data: {
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
        await client_js_1.prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'SUBSCRIPTION_UPGRADED',
                category: 'AUTH',
                details: `Upgraded subscription to ${plan} tier`,
                level: 'INFO',
            },
        });
        const token = (0, auth_js_2.generateToken)({
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            subscriptionTier: updatedUser.subscriptionTier,
        });
        res.json({
            success: true,
            tier: updatedUser.subscriptionTier,
            token,
            message: `Successfully updated to ${plan} plan. All corresponding features unlocked.`,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
