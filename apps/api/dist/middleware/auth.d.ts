import { Request, Response, NextFunction } from 'express';
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
export declare function generateToken(user: AuthenticatedUser): string;
export declare function requireAuth(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function requireSubscription(requiredTier: 'TRADER' | 'PRO'): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
