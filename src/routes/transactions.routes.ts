import { Router, type Request, type Response } from "express";
import { transactionsService } from "../services/transactions.service.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

const router = Router();

// GET /api/members/:memberId/transactions - Get member transaction history
router.get("/member/:memberId", requireAdmin, async (req: Request, res: Response) => {
    try {
        const transactions = await transactionsService.findByMemberId(req.params.memberId as string);
        res.json(transactions);
    } catch (error) {
        console.error("Get transactions error:", error);
        res.status(500).json({ error: "Gagal mengambil riwayat transaksi" });
    }
});

// PATCH /api/transactions/:id/verify - Verify a transaction (Admin only)
router.patch("/:id/verify", requireAdmin, async (req: Request, res: Response) => {
    try {
        const adminId = (req as any).adminId || "system";
        const transaction = await transactionsService.verify(req.params.id as string, adminId);
        if (!transaction) {
            return res.status(404).json({ error: "Transaksi tidak ditemukan" });
        }
        res.json({ success: true, message: "Transaksi berhasil diverifikasi", data: transaction });
    } catch (error) {
        console.error("Verify transaction error:", error);
        res.status(500).json({ error: "Gagal memverifikasi transaksi" });
    }
});

// PATCH /api/transactions/:id/reject - Reject a transaction (Admin only)
router.patch("/:id/reject", requireAdmin, async (req: Request, res: Response) => {
    try {
        const adminId = (req as any).adminId || "system";
        const transaction = await transactionsService.reject(req.params.id as string, adminId);
        if (!transaction) {
            return res.status(404).json({ error: "Transaksi tidak ditemukan" });
        }
        res.json({ success: true, message: "Transaksi ditolak", data: transaction });
    } catch (error) {
        console.error("Reject transaction error:", error);
        res.status(500).json({ error: "Gagal menolak transaksi" });
    }
});

export default router;
