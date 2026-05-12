export type PersonaId = "security-admin" | "support-lead" | "product-ops";

export type RequestStatus =
  | "reviewing"
  | "pending-approval"
  | "blocked"
  | "approved";

export interface PersonaSummary {
  id: PersonaId;
  name: string;
  title: string;
  focus: string;
}

export interface ViewerSession extends PersonaSummary {
  authMode: "demo" | "oidc-ready";
  issuer?: string;
}

export interface DashboardMetric {
  label: string;
  value: string;
  change: string;
  tone: "neutral" | "positive" | "warning" | "critical";
  note: string;
}

export interface TenantSnapshot {
  id: string;
  name: string;
  region: string;
  tier: string;
  identityProvider: string;
  riskLevel: string;
  seatUtilization: number;
  approvalLatencyHours: number;
}

export interface AccessRequestSnapshot {
  id: string;
  tenantId: string;
  tenantName: string;
  requestorName: string;
  requestorRole: string;
  targetResource: string;
  requestedScope: string;
  reason: string;
  status: RequestStatus;
  riskScore: number;
  requiresApproval: boolean;
  createdAt: string;
  expiresAt: string;
  policyPath: string;
  cachedPolicy: boolean;
}

export interface TimelineEvent {
  id: string;
  requestId: string;
  stage: string;
  owner: string;
  outcome: string;
  note: string;
  createdAt: string;
}

export interface DeploymentAsset {
  label: string;
  path: string;
  summary: string;
}

export interface TestSignal {
  label: string;
  summary: string;
  status: "verified" | "wired" | "ready";
}

export interface DashboardSnapshot {
  viewer: ViewerSession;
  cacheMode: string;
  authStatus: string;
  metrics: DashboardMetric[];
  tenants: TenantSnapshot[];
  requests: AccessRequestSnapshot[];
  timeline: TimelineEvent[];
  deploymentAssets: DeploymentAsset[];
  testSignals: TestSignal[];
  graphqlPreview: string;
}

export interface RequestAnalysis {
  requestId: string;
  disposition: "allow" | "hold" | "escalate";
  confidence: number;
  rationale: string[];
  nextAction: string;
}
