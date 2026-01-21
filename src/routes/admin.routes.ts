import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "crypto";
import { db } from "../db/index.js";
import { admins, type Member } from "../db/schema.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

const router = Router();

// Simple hash function for PIN (use bcrypt in production)
function hashPin(pin: string): string {
    return bcrypt.createHash("sha256").update(pin).digest("hex");
}

// POST /api/admin/verify-pin - Verify admin PIN
router.post("/verify-pin", async (req: Request, res: Response) => {
    try {
        const { pin } = req.body;

        if (!pin) {
            return res.status(400).json({ error: "PIN wajib diisi" });
        }

        const pinHash = hashPin(pin);

        const admin = await db.query.admins.findFirst({
            where: eq(admins.pinHash, pinHash),
        });

        if (!admin) {
            return res.status(401).json({ error: "PIN salah" });
        }

        // Return admin token/info (in production, use JWT or session)
        res.json({
            success: true,
            message: "Akses admin berhasil",
            admin: {
                id: admin.id,
                role: admin.role,
            },
        });
    } catch (error) {
        console.error("Verify PIN error:", error);
        res.status(500).json({ error: "Gagal verifikasi PIN" });
    }
});

// GET /api/admin/stats - Get dashboard statistics (Admin only)
router.get("/stats", requireAdmin, async (req: Request, res: Response) => {
    try {
        const now = new Date().toISOString().split("T")[0];

        const allMembers = await db.query.members.findMany();

        const stats = {
            total: allMembers.length,
            active: allMembers.filter((m: Member) => m.status === "active" && m.activeUntil >= now).length,
            expired: allMembers.filter((m: Member) => m.activeUntil < now).length,
            pending: allMembers.filter((m: Member) => m.status === "pending").length,
        };

        res.json(stats);
    } catch (error) {
        console.error("Get stats error:", error);
        res.status(500).json({ error: "Gagal mengambil statistik" });
    }
});

// POST /api/admin/seed-pin - Create initial admin PIN (One-time setup)
router.post("/seed-pin", async (req: Request, res: Response) => {
    try {
        const { pin, secret } = req.body;

        // Simple protection for seeding (use environment variable in production)
        if (secret !== process.env.ADMIN_SEED_SECRET) {
            return res.status(403).json({ error: "Akses ditolak" });
        }

        const existingAdmin = await db.query.admins.findFirst();
        if (existingAdmin) {
            return res.status(400).json({ error: "Admin sudah ada" });
        }

        const [admin] = await db
            .insert(admins)
            .values({
                pinHash: hashPin(pin),
                role: "super_admin",
            })
            .returning();

        res.json({ success: true, message: "Admin PIN berhasil dibuat" });
    } catch (error) {
        console.error("Seed PIN error:", error);
        res.status(500).json({ error: "Gagal membuat admin" });
    }
});

export default router;
