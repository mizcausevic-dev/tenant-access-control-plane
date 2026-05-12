import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  region: varchar("region", { length: 32 }).notNull(),
  tier: varchar("tier", { length: 32 }).notNull(),
  identityProvider: varchar("identity_provider", { length: 120 }).notNull(),
  riskLevel: varchar("risk_level", { length: 24 }).notNull(),
  seatUtilization: integer("seat_utilization").notNull(),
  approvalLatencyHours: integer("approval_latency_hours").notNull(),
});

export const memberships = pgTable("memberships", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  roleTitle: varchar("role_title", { length: 120 }).notNull(),
  accessScope: varchar("access_scope", { length: 160 }).notNull(),
  oidcSubject: varchar("oidc_subject", { length: 160 }).notNull(),
  lastAccessedAt: timestamp("last_accessed_at", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  elevationFlag: boolean("elevation_flag").notNull().default(false),
});

export const accessRequests = pgTable("access_requests", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  requestorName: varchar("requestor_name", { length: 120 }).notNull(),
  requestorRole: varchar("requestor_role", { length: 120 }).notNull(),
  targetResource: varchar("target_resource", { length: 160 }).notNull(),
  requestedScope: varchar("requested_scope", { length: 160 }).notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 24 }).notNull(),
  riskScore: integer("risk_score").notNull(),
  requiresApproval: boolean("requires_approval").notNull().default(true),
  createdAt: timestamp("created_at", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  expiresAt: timestamp("expires_at", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  policyPath: varchar("policy_path", { length: 200 }).notNull(),
  cachedPolicy: boolean("cached_policy").notNull().default(true),
});

export const policyEvents = pgTable("policy_events", {
  id: varchar("id", { length: 64 }).primaryKey(),
  requestId: varchar("request_id", { length: 64 }).notNull(),
  stage: varchar("stage", { length: 120 }).notNull(),
  owner: varchar("owner", { length: 120 }).notNull(),
  outcome: varchar("outcome", { length: 64 }).notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
});
