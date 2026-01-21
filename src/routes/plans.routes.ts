import { Router, type Request, type Response } from "express";
import { plansService } from "../services/plans.service.js";

const router = Router();

// GET /api/plans - List all active membership plans (Public)
router.get("/", async (req: Request, res: Response) => {
    try {
        const plans = await plansService.findAll();

        // Format price for frontend display
        const formattedPlans = plans.map((plan) => ({
            id: plan.id,
            label: plan.label,
            duration: plan.duration,
            durationMonths: plan.durationMonths,
            price: `Rp ${(plan.priceInCents / 100).toLocaleString("id-ID")}`,
            priceInCents: plan.priceInCents,
        }));

        res.json(formattedPlans);
    } catch (error) {
        console.error("Get plans error:", error);
        res.status(500).json({ error: "Gagal mengambil data paket" });
    }
});

// GET /api/plans/:id - Get plan by ID (Public)
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const plan = await plansService.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ error: "Paket tidak ditemukan" });
        }

        res.json({
            ...plan,
            price: `Rp ${(plan.priceInCents / 100).toLocaleString("id-ID")}`,
        });
    } catch (error) {
        console.error("Get plan error:", error);
        res.status(500).json({ error: "Gagal mengambil data paket" });
    }
});

export default router;
