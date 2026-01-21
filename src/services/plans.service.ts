import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { membershipPlans, type MembershipPlan } from "../db/schema.js";

// Default plans matching frontend MEMBERSHIP_PLANS
const DEFAULT_PLANS = [
    { id: "monthly", label: "Bulanan", duration: "1 Bulan", durationMonths: 1, priceInCents: 9000000 },
    { id: "quarterly", label: "Triwulan", duration: "3 Bulan", durationMonths: 3, priceInCents: 25000000 },
    { id: "semiannual", label: "Semester", duration: "6 Bulan", durationMonths: 6, priceInCents: 55000000 },
    { id: "annual", label: "Tahunan", duration: "1 Tahun", durationMonths: 12, priceInCents: 75000000 },
];

export const plansService = {
    async findAll(): Promise<MembershipPlan[]> {
        return db.query.membershipPlans.findMany({
            where: eq(membershipPlans.isActive, true),
        });
    },

    async findById(id: string): Promise<MembershipPlan | undefined> {
        return db.query.membershipPlans.findFirst({
            where: eq(membershipPlans.id, id),
        });
    },

    // Seed default plans if they don't exist
    async seedDefaults() {
        for (const plan of DEFAULT_PLANS) {
            const existing = await this.findById(plan.id);
            if (!existing) {
                await db.insert(membershipPlans).values({
                    id: plan.id,
                    label: plan.label,
                    duration: plan.duration,
                    durationMonths: plan.durationMonths,
                    priceInCents: plan.priceInCents,
                    isActive: true,
                });
                console.log(`Seeded membership plan: ${plan.label}`);
            }
        }
    },
};
