import { Router, type Request, type Response } from "express";
import { membersService, type CreateMemberInput, type MemberFilters } from "../services/members.service.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import { upload } from "../utils/upload.js";

const router = Router();

// POST /api/members/register - Public registration
router.post("/register", upload.single("transferProof"), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "Transfer proof image is required" });
        }

        const input: CreateMemberInput = {
            memberType: req.body.memberType,
            name: req.body.name,
            email: req.body.email,
            ahassNumber: req.body.ahassNumber,
            dealerCode: req.body.dealerCode,
            dealerName: req.body.dealerName,
            dealerCity: req.body.dealerCity,
            picPhoneNumber: req.body.picPhoneNumber,
            membershipPlanId: req.body.membershipPlanId,
            transferDate: req.body.transferDate,
            transferProofUrl: `/uploads/${file.filename}`,
        };

        const member = await membersService.create(input);

        res.status(201).json({
            success: true,
            message: "Registrasi berhasil dikirim. Menunggu verifikasi admin.",
            data: member,
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Gagal melakukan registrasi" });
    }
});

// GET /api/members - List all members (Admin only)
router.get("/", requireAdmin, async (req: Request, res: Response) => {
    try {
        const filters: MemberFilters = {
            status: (req.query.status as any) || "all",
            search: req.query.search as string,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 20,
        };

        const result = await membersService.findAll(filters);
        res.json(result);
    } catch (error) {
        console.error("List members error:", error);
        res.status(500).json({ error: "Gagal mengambil data member" });
    }
});

// GET /api/members/export/csv - Export members to CSV (Admin only)
router.get("/export/csv", requireAdmin, async (req: Request, res: Response) => {
    try {
        const filters: MemberFilters = {
            status: (req.query.status as any) || "all",
            search: req.query.search as string,
        };

        const csv = await membersService.exportToCsv(filters);

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Awass_Members_${new Date().toISOString().split("T")[0]}.csv"`
        );
        res.send(csv);
    } catch (error) {
        console.error("Export CSV error:", error);
        res.status(500).json({ error: "Gagal mengekspor data" });
    }
});

// GET /api/members/:id - Get member by ID (Admin only)
router.get("/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
        const member = await membersService.findById(req.params.id as string);
        if (!member) {
            return res.status(404).json({ error: "Member tidak ditemukan" });
        }
        res.json(member);
    } catch (error) {
        console.error("Get member error:", error);
        res.status(500).json({ error: "Gagal mengambil data member" });
    }
});

// PATCH /api/members/:id - Update member (Admin only)
router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
        const member = await membersService.update(req.params.id as string, req.body);
        if (!member) {
            return res.status(404).json({ error: "Member tidak ditemukan" });
        }
        res.json({ success: true, data: member });
    } catch (error) {
        console.error("Update member error:", error);
        res.status(500).json({ error: "Gagal mengubah data member" });
    }
});

// POST /api/members/:id/activate - Activate pending member (Admin only)
router.post("/:id/activate", requireAdmin, async (req: Request, res: Response) => {
    try {
        const member = await membersService.activate(req.params.id as string);
        if (!member) {
            return res.status(404).json({ error: "Member tidak ditemukan" });
        }
        res.json({ success: true, message: "Member berhasil diaktifkan", data: member });
    } catch (error) {
        console.error("Activate member error:", error);
        res.status(500).json({ error: "Gagal mengaktifkan member" });
    }
});

export default router;
