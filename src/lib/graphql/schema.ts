import { createSchema } from "graphql-yoga";

import {
  getDashboardSnapshot,
  getRequestById,
  updateRequestStatus,
} from "../domain/service";

const typeDefs = /* GraphQL */ `
  type ViewerSession {
    id: String!
    name: String!
    title: String!
    focus: String!
    authMode: String!
    issuer: String
  }

  type DashboardMetric {
    label: String!
    value: String!
    change: String!
    tone: String!
    note: String!
  }

  type TenantSnapshot {
    id: String!
    name: String!
    region: String!
    tier: String!
    identityProvider: String!
    riskLevel: String!
    seatUtilization: Int!
    approvalLatencyHours: Int!
  }

  type AccessRequestSnapshot {
    id: String!
    tenantId: String!
    tenantName: String!
    requestorName: String!
    requestorRole: String!
    targetResource: String!
    requestedScope: String!
    reason: String!
    status: String!
    riskScore: Int!
    requiresApproval: Boolean!
    createdAt: String!
    expiresAt: String!
    policyPath: String!
    cachedPolicy: Boolean!
  }

  type TimelineEvent {
    id: String!
    requestId: String!
    stage: String!
    owner: String!
    outcome: String!
    note: String!
    createdAt: String!
  }

  type DeploymentAsset {
    label: String!
    path: String!
    summary: String!
  }

  type TestSignal {
    label: String!
    summary: String!
    status: String!
  }

  type DashboardSnapshot {
    viewer: ViewerSession!
    cacheMode: String!
    authStatus: String!
    metrics: [DashboardMetric!]!
    tenants: [TenantSnapshot!]!
    requests: [AccessRequestSnapshot!]!
    timeline: [TimelineEvent!]!
    deploymentAssets: [DeploymentAsset!]!
    testSignals: [TestSignal!]!
    graphqlPreview: String!
  }

  type RequestAnalysis {
    requestId: String!
    disposition: String!
    confidence: Float!
    rationale: [String!]!
    nextAction: String!
  }

  type RequestDetail {
    request: AccessRequestSnapshot!
    analysis: RequestAnalysis!
    timeline: [TimelineEvent!]!
  }

  type Query {
    dashboardSummary: DashboardSnapshot!
    tenants: [TenantSnapshot!]!
    requests(status: String): [AccessRequestSnapshot!]!
    request(id: String!): RequestDetail
  }

  type Mutation {
    updateRequestStatus(id: String!, status: String!, owner: String!): RequestDetail
  }
`;

export const schema = createSchema({
  typeDefs,
  resolvers: {
    Query: {
      dashboardSummary: () => getDashboardSnapshot(),
      tenants: async () => (await getDashboardSnapshot()).tenants,
      requests: async (_root, args: { status?: string }) => {
        const requests = (await getDashboardSnapshot()).requests;

        if (!args.status) {
          return requests;
        }

        return requests.filter((request) => request.status === args.status);
      },
      request: (_root, args: { id: string }) => getRequestById(args.id),
    },
    Mutation: {
      updateRequestStatus: (
        _root,
        args: { id: string; status: string; owner: string },
      ) =>
        updateRequestStatus({
          requestId: args.id,
          status: args.status as
            | "reviewing"
            | "pending-approval"
            | "blocked"
            | "approved",
          owner: args.owner,
        }),
    },
  },
});
