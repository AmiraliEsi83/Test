import { Router } from 'express';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@harsi/shared';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

router.get('/plans', (req, res) => {
  res.json({ plans: SUBSCRIPTION_PLANS });
});

router.get('/current', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const tier = (user.subscriptionTier as SubscriptionTier) || 'FREE';
    const planDetails = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.FREE;

    res.json({
      tier,
      details: planDetails,
      subscription: user.subscriptions[0] || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upgrade', requireAuth, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['FREE', 'TRADER', 'PRO'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
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

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'SUBSCRIPTION_UPGRADED',
        category: 'AUTH',
        details: `Upgraded subscription to ${plan} tier`,
        level: 'INFO',
      },
    });

    const token = generateToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      subscriptionTier: updatedUser.subscriptionTier as any,
    });

    res.json({
      success: true,
      tier: updatedUser.subscriptionTier,
      token,
      message: `Successfully updated to ${plan} plan. All corresponding features unlocked.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
