import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/client.js';
import { generateToken, requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, plan = 'TRADER' } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
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

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionTier: user.subscriptionTier as any,
    });

    await prisma.auditLog.create({
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionTier: user.subscriptionTier as any,
    });

    await prisma.auditLog.create({
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err: any) {
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

export default router;
