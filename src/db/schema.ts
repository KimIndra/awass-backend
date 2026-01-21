import { pgTable, text, boolean, timestamp, integer, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ============================================
// Better Auth Tables
// ============================================

export const users = pgTable("users", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const accounts = pgTable("accounts", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const verifications = pgTable("verifications", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// Application Tables
// ============================================

export const membershipPlans = pgTable("membership_plans", {
    id: text("id").primaryKey(), // 'monthly', 'quarterly', 'semiannual', 'annual'
    label: text("label").notNull(),
    duration: text("duration").notNull(),
    durationMonths: integer("duration_months").notNull(),
    priceInCents: integer("price_in_cents").notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
});

export const members = pgTable("members", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").references(() => users.id),
    memberType: text("member_type").notNull().$type<"dealer" | "ahass">(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    avatarUrl: text("avatar_url"),
    ahassNumber: text("ahass_number").notNull(),
    dealerCode: text("dealer_code"),
    dealerName: text("dealer_name").notNull(),
    dealerCity: text("dealer_city").notNull(),
    picPhoneNumber: text("pic_phone_number").notNull(),
    membershipPlanId: text("membership_plan_id").references(() => membershipPlans.id),
    activeUntil: date("active_until").notNull(),
    status: text("status").notNull().$type<"pending" | "active" | "expired" | "rejected">().default("pending"),
    joinedAt: timestamp("joined_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    type: text("type").notNull().$type<"registration" | "renewal">(),
    planId: text("plan_id").notNull().references(() => membershipPlans.id),
    amountInCents: integer("amount_in_cents").notNull(),
    transferDate: date("transfer_date").notNull(),
    transferProofUrl: text("transfer_proof_url").notNull(),
    status: text("status").notNull().$type<"pending" | "verified" | "rejected">().default("pending"),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: text("verified_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
});

export const renewalRequests = pgTable("renewal_requests", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    requestedPlanId: text("requested_plan_id").notNull().references(() => membershipPlans.id),
    transferDate: date("transfer_date").notNull(),
    transferProofUrl: text("transfer_proof_url").notNull(),
    status: text("status").notNull().$type<"pending" | "approved" | "rejected">().default("pending"),
    processedBy: text("processed_by").references(() => users.id),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const admins = pgTable("admins", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    pinHash: text("pin_hash"),
    role: text("role").notNull().$type<"super_admin" | "admin" | "verifier">().default("admin"),
    createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// Relations
// ============================================

export const usersRelations = relations(users, ({ many, one }) => ({
    sessions: many(sessions),
    accounts: many(accounts),
    member: one(members, {
        fields: [users.id],
        references: [members.userId],
    }),
    admin: one(admins, {
        fields: [users.id],
        references: [admins.userId],
    }),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
    user: one(users, {
        fields: [members.userId],
        references: [users.id],
    }),
    plan: one(membershipPlans, {
        fields: [members.membershipPlanId],
        references: [membershipPlans.id],
    }),
    transactions: many(transactions),
    renewalRequests: many(renewalRequests),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
    member: one(members, {
        fields: [transactions.memberId],
        references: [members.id],
    }),
    plan: one(membershipPlans, {
        fields: [transactions.planId],
        references: [membershipPlans.id],
    }),
    verifier: one(users, {
        fields: [transactions.verifiedBy],
        references: [users.id],
    }),
}));

export const renewalRequestsRelations = relations(renewalRequests, ({ one }) => ({
    member: one(members, {
        fields: [renewalRequests.memberId],
        references: [members.id],
    }),
    plan: one(membershipPlans, {
        fields: [renewalRequests.requestedPlanId],
        references: [membershipPlans.id],
    }),
    processor: one(users, {
        fields: [renewalRequests.processedBy],
        references: [users.id],
    }),
}));

// ============================================
// Type Exports
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type MembershipPlan = typeof membershipPlans.$inferSelect;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type RenewalRequest = typeof renewalRequests.$inferSelect;
export type NewRenewalRequest = typeof renewalRequests.$inferInsert;
export type Admin = typeof admins.$inferSelect;
