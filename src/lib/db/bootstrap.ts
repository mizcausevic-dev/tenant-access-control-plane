import { count } from "drizzle-orm";

import {
  seededMemberships,
  seededRequests,
  seededTenants,
  seededTimeline,
} from "../domain/sample-data";
import { getDatabase } from "./client";
import {
  accessRequests,
  memberships,
  policyEvents,
  tenants,
} from "./schema";

let bootstrapped = false;

const bootstrapSql = `
CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  region VARCHAR(32) NOT NULL,
  tier VARCHAR(32) NOT NULL,
  identity_provider VARCHAR(120) NOT NULL,
  risk_level VARCHAR(24) NOT NULL,
  seat_utilization INTEGER NOT NULL,
  approval_latency_hours INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  role_title VARCHAR(120) NOT NULL,
  access_scope VARCHAR(160) NOT NULL,
  oidc_subject VARCHAR(160) NOT NULL,
  last_accessed_at TIMESTAMPTZ NOT NULL,
  elevation_flag BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS access_requests (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  requestor_name VARCHAR(120) NOT NULL,
  requestor_role VARCHAR(120) NOT NULL,
  target_resource VARCHAR(160) NOT NULL,
  requested_scope VARCHAR(160) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(24) NOT NULL,
  risk_score INTEGER NOT NULL,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  policy_path VARCHAR(200) NOT NULL,
  cached_policy BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS policy_events (
  id VARCHAR(64) PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL,
  stage VARCHAR(120) NOT NULL,
  owner VARCHAR(120) NOT NULL,
  outcome VARCHAR(64) NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
`;

export async function ensureBootstrapped() {
  if (bootstrapped) {
    return;
  }

  const database = await getDatabase();
  await database.executeRaw(bootstrapSql);

  const [{ value: tenantCount }] = await database.db
    .select({ value: count() })
    .from(tenants);

  if (tenantCount === 0) {
    await database.db.insert(tenants).values(seededTenants);
    await database.db.insert(memberships).values(seededMemberships);
    await database.db.insert(accessRequests).values(seededRequests);
    await database.db.insert(policyEvents).values(seededTimeline);
  }

  bootstrapped = true;
}
