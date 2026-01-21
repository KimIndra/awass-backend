import { eq, and, like, or, desc, gte, lt, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { members, membershipPlans, transactions, type NewMember, type Member } from "../db/schema.js";
import { createId } from "@paralleldrive/cuid2";

export interface CreateMemberInput {
    memberType: "dealer" | "ahass";
    name: string;
    email: string;
    ahassNumber: string;
    dealerCode?: string;
    dealerName: string;
    dealerCity: string;
    picPhoneNumber: string;
    membershipPlanId: string;
    transferDate: string;
    transferProofUrl: string;
}

export interface MemberFilters {
    status?: "all" | "active" | "expired" | "pending";
    search?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

function calculateExpiry(startDate: string, durationMonths: number): string {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + durationMonths);
    return date.toISOString().split("T")[0];
}

export const membersService = {
    async create(input: CreateMemberInput): Promise<Member> {
        const plan = await db.query.membershipPlans.findFirst({
            where: eq(membershipPlans.id, input.membershipPlanId),
        });

        if (!plan) {
            throw new Error(`Membership plan ${input.membershipPlanId} not found`);
        }

        const activeUntil = calculateExpiry(input.transferDate, plan.durationMonths);
        const memberId = createId();

        const [newMember] = await db
            .insert(members)
            .values({
                id: memberId,
                memberType: input.memberType,
                name: input.name,
                email: input.email,
                ahassNumber: input.ahassNumber,
                dealerCode: input.dealerCode || null,
                dealerName: input.dealerName,
                dealerCity: input.dealerCity,
                picPhoneNumber: input.picPhoneNumber,
                membershipPlanId: input.membershipPlanId,
                activeUntil: activeUntil,
                status: "pending",
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=0ea5e9&color=fff`,
            })
            .returning();

        // Create initial registration transaction
        await db.insert(transactions).values({
            memberId: memberId,
            type: "registration",
            planId: input.membershipPlanId,
            amountInCents: plan.priceInCents,
            transferDate: input.transferDate,
            transferProofUrl: input.transferProofUrl,
            status: "pending",
        });

        return newMember;
    },

    async findAll(filters: MemberFilters): Promise<PaginatedResult<Member>> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;
        const now = new Date().toISOString().split("T")[0];

        const conditions = [];

        // Status filter
        if (filters.status === "active") {
            conditions.push(gte(members.activeUntil, now));
            conditions.push(eq(members.status, "active"));
        } else if (filters.status === "expired") {
            conditions.push(lt(members.activeUntil, now));
        } else if (filters.status === "pending") {
            conditions.push(eq(members.status, "pending"));
        }

        // Search filter
        if (filters.search) {
            const searchTerm = `%${filters.search}%`;
            conditions.push(
                or(
                    like(members.name, searchTerm),
                    like(members.dealerCode, searchTerm),
                    like(members.dealerName, searchTerm),
                    like(members.ahassNumber, searchTerm)
                )
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [data, countResult] = await Promise.all([
            db.query.members.findMany({
                where: whereClause,
                with: {
                    plan: true,
                },
                orderBy: [desc(members.createdAt)],
                limit: limit,
                offset: offset,
            }),
            db
                .select({ count: sql<number>`count(*)` })
                .from(members)
                .where(whereClause),
        ]);

        const total = Number(countResult[0]?.count || 0);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    },

    async findById(id: string) {
        return db.query.members.findFirst({
            where: eq(members.id, id),
            with: {
                plan: true,
                transactions: {
                    orderBy: [desc(transactions.createdAt)],
                    with: {
                        plan: true,
                    },
                },
            },
        });
    },

    async update(id: string, data: Partial<NewMember>) {
        const [updated] = await db
            .update(members)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(members.id, id))
            .returning();
        return updated;
    },

    async activate(id: string) {
        return this.update(id, { status: "active" });
    },

    async checkAndUpdateExpired() {
        const now = new Date().toISOString().split("T")[0];
        await db
            .update(members)
            .set({ status: "expired" })
            .where(and(lt(members.activeUntil, now), eq(members.status, "active")));
    },

    async exportToCsv(filters: MemberFilters): Promise<string> {
        const result = await this.findAll({ ...filters, limit: 10000 }); // Export up to 10k records

        const headers = [
            "ID",
            "Nama Member",
            "Email",
            "Tipe",
            "No AHASS",
            "Kode Dealer",
            "Nama Dealer",
            "Kota",
            "No HP PIC",
            "Paket",
            "Berlaku Hingga",
            "Status",
            "Tanggal Bergabung",
        ];

        const rows = result.data.map((m) => {
            return [
                m.id,
                m.name,
                m.email,
                m.memberType,
                m.ahassNumber,
                m.dealerCode || "",
                m.dealerName,
                m.dealerCity,
                m.picPhoneNumber,
                m.membershipPlanId,
                m.activeUntil,
                m.status,
                m.joinedAt?.toISOString().split("T")[0] || "",
            ]
                .map((field) => `"${String(field).replace(/"/g, '""')}"`)
                .join(",");
        });

        return [headers.join(","), ...rows].join("\n");
    },
};
