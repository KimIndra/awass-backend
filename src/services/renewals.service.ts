import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
    renewalRequests,
    members,
    membershipPlans,
    transactions,
    type RenewalRequest,
} from "../db/schema.js";

export interface CreateRenewalInput {
    memberId: string;
    requestedPlanId: string;
    transferDate: string;
    transferProofUrl: string;
}

function calculateExpiry(startDate: string, durationMonths: number): string {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + durationMonths);
    return date.toISOString().split("T")[0];
}

export const renewalsService = {
    async create(input: CreateRenewalInput): Promise<RenewalRequest> {
        const [renewal] = await db
            .insert(renewalRequests)
            .values({
                memberId: input.memberId,
                requestedPlanId: input.requestedPlanId,
                transferDate: input.transferDate,
                transferProofUrl: input.transferProofUrl,
                status: "pending",
            })
            .returning();

        return renewal;
    },

    async findPending() {
        return db.query.renewalRequests.findMany({
            where: eq(renewalRequests.status, "pending"),
            with: {
                member: true,
                plan: true,
            },
            orderBy: [desc(renewalRequests.createdAt)],
        });
    },

    async findById(id: string) {
        return db.query.renewalRequests.findFirst({
            where: eq(renewalRequests.id, id),
            with: {
                member: true,
                plan: true,
            },
        });
    },

    async approve(id: string, adminId: string) {
        const renewal = await this.findById(id);
        if (!renewal) {
            throw new Error("Renewal request not found");
        }

        if (renewal.status !== "pending") {
            throw new Error("Renewal request already processed");
        }

        const plan = await db.query.membershipPlans.findFirst({
            where: eq(membershipPlans.id, renewal.requestedPlanId),
        });

        if (!plan) {
            throw new Error("Plan not found");
        }

        const member = renewal.member;
        const now = new Date();
        const currentExpiry = new Date(member.activeUntil);

        // If member is expired, start from transfer date; otherwise extend from current expiry
        const baseDate =
            now > currentExpiry
                ? renewal.transferDate
                : member.activeUntil;

        const newActiveUntil = calculateExpiry(baseDate, plan.durationMonths);

        // Update renewal request status
        await db
            .update(renewalRequests)
            .set({
                status: "approved",
                processedBy: adminId,
                processedAt: new Date(),
            })
            .where(eq(renewalRequests.id, id));

        // Update member's active until and plan
        await db
            .update(members)
            .set({
                activeUntil: newActiveUntil,
                membershipPlanId: renewal.requestedPlanId,
                status: "active",
                updatedAt: new Date(),
            })
            .where(eq(members.id, renewal.memberId));

        // Create renewal transaction
        await db.insert(transactions).values({
            memberId: renewal.memberId,
            type: "renewal",
            planId: renewal.requestedPlanId,
            amountInCents: plan.priceInCents,
            transferDate: renewal.transferDate,
            transferProofUrl: renewal.transferProofUrl,
            status: "verified",
            verifiedAt: new Date(),
            verifiedBy: adminId,
        });

        return { success: true, newActiveUntil };
    },

    async reject(id: string, adminId: string) {
        const [updated] = await db
            .update(renewalRequests)
            .set({
                status: "rejected",
                processedBy: adminId,
                processedAt: new Date(),
            })
            .where(eq(renewalRequests.id, id))
            .returning();

        return updated;
    },
};
