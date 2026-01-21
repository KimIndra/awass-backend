import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
            };
        }
    }
}

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers as any),
        });

        if (!session || !session.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        req.user = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
        };

        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(401).json({ error: "Unauthorized" });
    }
}
