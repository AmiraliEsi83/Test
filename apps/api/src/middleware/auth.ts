import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';

const JWT_SECRET = process.env.JWT_SECRET || 'harsi_institutional_secret_jwt_key_993481239';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  subscriptionTier: 'FREE' | 'TRADER' | 'PRO';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionTier: user.subscriptionTier,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please provide a Bearer token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

export function requireSubscription(requiredTier: 'TRADER' | 'PRO') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const tierRank = {
      FREE: 1,
      TRADER: 2,
      PRO: 3,
    };

    const userTier = req.user.subscriptionTier || 'FREE';
    if (tierRank[userTier] < tierRank[requiredTier]) {
      return res.status(403).json({
        error: `Feature requires ${requiredTier} subscription plan. Your current plan is ${userTier}.`,
        requiredTier,
        currentTier: userTier,
      });
    }

    next();
  };
}
