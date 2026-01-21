import { Router } from "express";
import authRoutes from "./auth.routes.js";
import membersRoutes from "./members.routes.js";
import transactionsRoutes from "./transactions.routes.js";
import renewalsRoutes from "./renewals.routes.js";
import plansRoutes from "./plans.routes.js";
import adminRoutes from "./admin.routes.js";

const router = Router();

// Mount all routes
router.use("/auth", authRoutes);
router.use("/members", membersRoutes);
router.use("/transactions", transactionsRoutes);
router.use("/renewals", renewalsRoutes);
router.use("/plans", plansRoutes);
router.use("/admin", adminRoutes);

export default router;
