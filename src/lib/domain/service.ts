import { asc, desc, eq, inArray } from "drizzle-orm";

import { cacheDeleteByPrefix, cacheGet, cacheSet, getCacheMode } from "../cache";
import { getViewerSession } from "../auth";
import { ensureBootstrapped } from "../db/bootstrap";
import { getDatabase } from "../db/client";
import {
  accessRequests,
  memberships,
  policyEvents,
  tenants,
} from "../db/schema";
import type {
  AccessRequestSnapshot,
  DashboardSnapshot,
  DeploymentAsset,
  RequestAnalysis,
  RequestStatus,
  TenantSnapshot,
  TestSignal,
  TimelineEvent,
} from "./types";

const deploymentAssets: DeploymentAsset[] = [
  {
    label: "Docker Compose",
    path: "docker-compose.yml",
    summary: "Optional Postgres + Redis startup for a production-shaped local stack.",
  },
  {
    label: "Helm chart",
    path: "helm/tenant-access-control-plane",
    summary: "Charted deployment surface for orgs standardizing on Kubernetes.",
  },
  {
    label: "Kubernetes manifests",
    path: "k8s/",
    summary: "Straight manifests for quick platform review without Helm adoption.",
  },
  {
    label: "GitHub Actions",
    path: ".github/workflows/ci.yml",
    summary: "Lint, unit, e2e, and build checks wired for merge-time quality gates.",
  },
];

const testSignals: TestSignal[] = [
  {
    label: "Vitest domain checks",
    summary: "Policy scoring, cache invalidation, and GraphQL contract helpers.",
    status: "verified",
  },
  {
    label: "Playwright journey",
    summary: "Homepage shell, docs route, and GraphQL docs smoke coverage.",
    status: "wired",
  },
  {
    label: "Build + lint",
    summary: "Next.js build and ESLint enforced through local verify and CI.",
    status: "verified",
  },
];

export function evaluateRequest(
  request: AccessRequestSnapshot,
): RequestAnalysis {
  const rationale: string[] = [];

  if (request.riskScore >= 90) {
    rationale.push("Risk score exceeds the tenant-safe threshold for direct elevation.");
  }

  if (!request.cachedPolicy) {
    rationale.push("Policy cache missed, so the lane needs a fresh security review.");
  }

  if (request.status === "blocked") {
    rationale.push("Request is currently pinned behind a policy hold or related incident.");
  }

  if (request.requestedScope.includes("settlement") || request.requestedScope.includes("admin")) {
    rationale.push("Requested scope touches a privileged path with downstream blast radius.");
  }

  if (rationale.length === 0) {
    rationale.push("Request fits an existing low-friction lane and can move with owner acknowledgement.");
  }

  if (request.riskScore >= 90 || request.status === "blocked") {
    return {
      requestId: request.id,
      disposition: "escalate",
      confidence: 0.92,
      rationale,
      nextAction: "Escalate to security and tenant owner for multi-party signoff.",
    };
  }

  if (request.riskScore >= 60 || request.requiresApproval) {
    return {
      requestId: request.id,
      disposition: "hold",
      confidence: 0.78,
      rationale,
      nextAction: "Hold the lane until policy owner acknowledges the time-bound request.",
    };
  }

  return {
    requestId: request.id,
    disposition: "allow",
    confidence: 0.84,
    rationale,
    nextAction: "Allow through the preview-safe lane and capture an audit snapshot.",
  };
}

function buildGraphqlPreview() {
  return `query TenantControlPlaneSnapshot {
  dashboardSummary {
    metrics {
      label
      value
      change
    }
  }
  requests(status: "reviewing") {
    id
    tenantName
    requestedScope
    riskScore
    status
  }
}`;
}

async function mapRequests() {
  const database = await getDatabase();

  const tenantRows = await database.db.select().from(tenants);
  const requestRows = await database.db
    .select()
    .from(accessRequests)
    .orderBy(desc(accessRequests.riskScore), asc(accessRequests.createdAt));

  const tenantNameMap = new Map(tenantRows.map((tenant) => [tenant.id, tenant.name]));

  return requestRows.map<AccessRequestSnapshot>((request) => ({
    id: request.id,
    tenantId: request.tenantId,
    tenantName: tenantNameMap.get(request.tenantId) ?? request.tenantId,
    requestorName: request.requestorName,
    requestorRole: request.requestorRole,
    targetResource: request.targetResource,
    requestedScope: request.requestedScope,
    reason: request.reason,
    status: request.status as RequestStatus,
    riskScore: request.riskScore,
    requiresApproval: request.requiresApproval,
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
    policyPath: request.policyPath,
    cachedPolicy: request.cachedPolicy,
  }));
}

async function mapTenants(): Promise<TenantSnapshot[]> {
  const database = await getDatabase();
  const tenantRows = await database.db
    .select()
    .from(tenants)
    .orderBy(desc(tenants.approvalLatencyHours));

  return tenantRows.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    region: tenant.region,
    tier: tenant.tier,
    identityProvider: tenant.identityProvider,
    riskLevel: tenant.riskLevel,
    seatUtilization: tenant.seatUtilization,
    approvalLatencyHours: tenant.approvalLatencyHours,
  }));
}

async function mapTimeline(requestIds: string[]): Promise<TimelineEvent[]> {
  const database = await getDatabase();
  const eventRows = await database.db
    .select()
    .from(policyEvents)
    .where(inArray(policyEvents.requestId, requestIds))
    .orderBy(desc(policyEvents.createdAt));

  return eventRows.map((event) => ({
    id: event.id,
    requestId: event.requestId,
    stage: event.stage,
    owner: event.owner,
    outcome: event.outcome,
    note: event.note,
    createdAt: event.createdAt,
  }));
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  await ensureBootstrapped();

  const viewer = await getViewerSession();
  const cacheKey = `dashboard:${viewer.id}`;
  const cached = await cacheGet<DashboardSnapshot>(cacheKey);

  if (cached) {
    return {
      ...cached,
      cacheMode: `${cached.cacheMode} (warm)`,
    };
  }

  const [tenantRows, requestRows] = await Promise.all([mapTenants(), mapRequests()]);
  const timeline = await mapTimeline(requestRows.map((request) => request.id));
  const cacheMode = await getCacheMode();

  const blockedRequests = requestRows.filter((request) => request.status === "blocked");
  const approvalRequired = requestRows.filter((request) => request.requiresApproval);
  const cachedPolicies = requestRows.filter((request) => request.cachedPolicy);

  const snapshot: DashboardSnapshot = {
    viewer,
    cacheMode: cacheMode === "redis" ? "Redis cache attached" : "In-memory cache fallback",
    authStatus:
      viewer.authMode === "oidc-ready"
        ? `OIDC ready (${viewer.issuer})`
        : "Demo SSO mode with signed session cookies",
    metrics: [
      {
        label: "Tenant lanes tracked",
        value: String(tenantRows.length),
        change: "+1 strategic review",
        tone: "neutral",
        note: "Each tenant has region, IdP, and latency posture modeled.",
      },
      {
        label: "Open access decisions",
        value: String(requestRows.length),
        change: `${approvalRequired.length} need approval`,
        tone: approvalRequired.length > 1 ? "warning" : "neutral",
        note: "Break-glass, preview-safe, and settlement-critical paths share the same graph.",
      },
      {
        label: "Blocked escalations",
        value: String(blockedRequests.length),
        change: blockedRequests.length > 0 ? "Funds lane under hold" : "No hard blocks",
        tone: blockedRequests.length > 0 ? "critical" : "positive",
        note: "Hard policy holds surface before tenant owners widen privileged scope.",
      },
      {
        label: "Policy cache coverage",
        value: `${Math.round((cachedPolicies.length / requestRows.length) * 100)}%`,
        change: cacheMode === "redis" ? "Redis hot path" : "Memory fallback active",
        tone: cacheMode === "redis" ? "positive" : "warning",
        note: "The same service can run with local cache or external Redis without code churn.",
      },
    ],
    tenants: tenantRows,
    requests: requestRows,
    timeline,
    deploymentAssets,
    testSignals,
    graphqlPreview: buildGraphqlPreview(),
  };

  await cacheSet(cacheKey, snapshot, 45);
  return snapshot;
}

export async function getRequestById(requestId: string) {
  const snapshot = await getDashboardSnapshot();
  const request = snapshot.requests.find((candidate) => candidate.id === requestId);

  if (!request) {
    return null;
  }

  return {
    request,
    analysis: evaluateRequest(request),
    timeline: snapshot.timeline.filter((event) => event.requestId === requestId),
  };
}

export async function updateRequestStatus(input: {
  requestId: string;
  status: RequestStatus;
  owner: string;
}) {
  await ensureBootstrapped();
  const database = await getDatabase();

  await database.db
    .update(accessRequests)
    .set({ status: input.status })
    .where(eq(accessRequests.id, input.requestId));

  await database.db.insert(policyEvents).values({
    id: `evt-${Date.now()}`,
    requestId: input.requestId,
    stage: "Owner decision",
    owner: input.owner,
    outcome: input.status,
    note: `Status moved to ${input.status} from the control plane mutation.`,
    createdAt: new Date().toISOString(),
  });

  await cacheDeleteByPrefix("dashboard:");
  return getRequestById(input.requestId);
}

export async function getMembershipSnapshot() {
  await ensureBootstrapped();
  const database = await getDatabase();
  const membershipRows = await database.db.select().from(memberships);
  const tenantRows = await mapTenants();
  const tenantMap = new Map(tenantRows.map((tenant) => [tenant.id, tenant]));

  return membershipRows.map((membership) => ({
    ...membership,
    tenantName: tenantMap.get(membership.tenantId)?.name ?? membership.tenantId,
  }));
}
