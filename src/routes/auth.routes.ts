import { Router, type Request, type Response, type NextFunction } from "express";
import { auth } from "../lib/auth.js";
import { toNodeHandler } from "better-auth/node";

const router = Router();

// Better Auth handles all /api/auth/* routes
router.all("/*", toNodeHandler(auth) as any);

export default router;
