import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { transactions, membershipPlans, type Transaction } from "../db/schema.js";

export interface CreateTransactionInput {
    memberId: string;
    type: "registration" | "renewal";
    planId: string;
    transferDate: string;
    transferProofUrl: string;
}

export const transactionsService = {
    async create(input: CreateTransactionInput): Promise<Transaction> {
        const plan = await db.query.membershipPlans.findFirst({
            where: eq(membershipPlans.id, input.planId),
        });

        if (!plan) {
            throw new Error(`Plan ${input.planId} not found`);
        }

        const [transaction] = await db
            .insert(transactions)
            .values({
                memberId: input.memberId,
                type: input.type,
                planId: input.planId,
                amountInCents: plan.priceInCents,
                transferDate: input.transferDate,
                transferProofUrl: input.transferProofUrl,
                status: "pending",
            })
            .returning();

        return transaction;
    },

    async findByMemberId(memberId: string) {
        return db.query.transactions.findMany({
            where: eq(transactions.memberId, memberId),
            with: {
                plan: true,
            },
            orderBy: [desc(transactions.createdAt)],
        });
    },

    async verify(id: string, verifiedBy: string) {
        const [updated] = await db
            .update(transactions)
            .set({
                status: "verified",
                verifiedAt: new Date(),
                verifiedBy: verifiedBy,
            })
            .where(eq(transactions.id, id))
            .returning();

        return updated;
    },

    async reject(id: string, verifiedBy: string) {
        const [updated] = await db
            .update(transactions)
            .set({
                status: "rejected",
                verifiedAt: new Date(),
                verifiedBy: verifiedBy,
            })
            .where(eq(transactions.id, id))
            .returning();

        return updated;
    },
};
