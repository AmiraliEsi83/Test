import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db/client.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { category, level, limit = '100' } = req.query;
    const where: any = {};
    if (category) where.category = String(category);
    if (level) where.level = String(level);

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit), 200),
    });

    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
