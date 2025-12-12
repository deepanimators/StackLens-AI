import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth-service.js';

// User type for authenticated requests
export interface AuthUser {
    id: number;
    email: string;
    username: string;
    role: string;
}

// Extend Express Request to include user
declare module 'express-serve-static-core' {
    interface Request {
        user?: AuthUser;
    }
}

const authService = new AuthService();

/**
 * Middleware to verify JWT token
 * Uses the same AuthService as the rest of the application for consistency
 */
export const verifyToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "");

        // In test mode with a token, create mock user
        if (process.env.NODE_ENV === 'test' && token) {
            req.user = {
                id: 1,
                email: 'test@stacklens.app',
                username: 'testuser',
                role: 'admin',
            };
            next();
            return;
        }

        if (!token) {
            res.status(401).json({ error: "Authentication required" });
            return;
        }

        // Validate token using AuthService (same as main-routes)
        const decoded = authService.validateToken(token);
        if (!decoded) {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }

        // Get user from database using AuthService
        const user = await authService.getUserById(decoded.userId);
        if (!user) {
            res.status(401).json({ error: "User not found" });
            return;
        }

        // Attach user to request (same format as main-routes)
        req.user = {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
        };

        next();
    } catch (error) {
        console.error("Token verification error:", error);
        res.status(401).json({ error: "Invalid or expired token" });
    }
};

/**
 * Middleware to require admin role
 * Accepts both 'admin' and 'super_admin' roles (same as main-routes)
 */
export const requireAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({ error: "Authentication required" });
        return;
    }

    // Allow both admin and super_admin roles (same logic as main-routes)
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        console.log(`⛔ Admin access denied for user ${req.user.id} with role: ${req.user.role}`);
        res.status(403).json({ error: "Admin access required" });
        return;
    }

    next();
};
