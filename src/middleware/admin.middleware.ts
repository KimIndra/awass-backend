import type { Request, Response, NextFunction } from "express";

declare global {
    namespace Express {
        interface Request {
            adminId?: string;
            isAdmin?: boolean;
        }
    }
}

/**
 * Middleware to require admin access.
 * Checks for admin token in Authorization header or X-Admin-Id header.
 * In a production environment, this should verify JWT or session.
 */
export async function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        // Check for admin ID in headers (set after PIN verification in frontend)
        const adminId = req.headers["x-admin-id"] as string;
        const adminToken = req.headers["authorization"]?.replace("Bearer ", "");

        if (!adminId && !adminToken) {
            return res.status(403).json({ error: "Akses admin diperlukan" });
        }

        // For now, trust the admin ID/token from the header
        // In production, verify this against stored sessions or JWT
        req.adminId = adminId || adminToken;
        req.isAdmin = true;

        next();
    } catch (error) {
        console.error("Admin middleware error:", error);
        return res.status(403).json({ error: "Akses admin diperlukan" });
    }
}
