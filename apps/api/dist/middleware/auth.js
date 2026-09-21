"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.requireAuth = requireAuth;
exports.requireSubscription = requireSubscription;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'harsi_institutional_secret_jwt_key_993481239';
function generateToken(user) {
    return jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
    }, JWT_SECRET, { expiresIn: '7d' });
}
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Please provide a Bearer token.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid or expired session token.' });
    }
}
function requireSubscription(requiredTier) {
    return (req, res, next) => {
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
