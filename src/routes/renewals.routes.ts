import { Router, type Request, type Response } from "express";
import { renewalsService } from "../services/renewals.service.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import { upload } from "../utils/upload.js";

const router = Router();

// POST /api/renewals - Submit renewal request (Member)
router.post("/", upload.single("transferProof"), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "Bukti transfer wajib dilampirkan" });
        }

        const renewal = await renewalsService.create({
            memberId: req.body.memberId,
            requestedPlanId: req.body.membershipPlanId,
            transferDate: req.body.transferDate,
            transferProofUrl: `/uploads/${file.filename}`,
        });

        res.status(201).json({
            success: true,
            message: "Pengajuan perpanjangan berhasil dikirim. Menunggu verifikasi admin.",
            data: renewal,
        });
    } catch (error) {
        console.error("Create renewal error:", error);
        res.status(500).json({ error: "Gagal mengajukan perpanjangan" });
    }
});

// GET /api/renewals - List pending renewals (Admin only)
router.get("/", requireAdmin, async (req: Request, res: Response) => {
    try {
        const renewals = await renewalsService.findPending();
        res.json(renewals);
    } catch (error) {
        console.error("List renewals error:", error);
        res.status(500).json({ error: "Gagal mengambil data pengajuan" });
    }
});

// PATCH /api/renewals/:id/approve - Approve renewal (Admin only)
router.patch("/:id/approve", requireAdmin, async (req: Request, res: Response) => {
    try {
        const adminId = (req as any).adminId || "system";
        const result = await renewalsService.approve(req.params.id as string, adminId);
        res.json({
            success: true,
            message: "Perpanjangan berhasil disetujui",
            newActiveUntil: result.newActiveUntil,
        });
    } catch (error: any) {
        console.error("Approve renewal error:", error);
        res.status(400).json({ error: error.message || "Gagal menyetujui perpanjangan" });
    }
});

// PATCH /api/renewals/:id/reject - Reject renewal (Admin only)
router.patch("/:id/reject", requireAdmin, async (req: Request, res: Response) => {
    try {
        const adminId = (req as any).adminId || "system";
        await renewalsService.reject(req.params.id as string, adminId);
        res.json({ success: true, message: "Pengajuan ditolak" });
    } catch (error) {
        console.error("Reject renewal error:", error);
        res.status(500).json({ error: "Gagal menolak pengajuan" });
    }
});

export default router;
