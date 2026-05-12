import { describe, expect, it } from "vitest";

import { cacheDeleteByPrefix, cacheGet, cacheSet } from "@/lib/cache";
import { evaluateRequest } from "@/lib/domain/service";
import type { AccessRequestSnapshot } from "@/lib/domain/types";

const baseRequest: AccessRequestSnapshot = {
  id: "req-demo",
  tenantId: "tenant-demo",
  tenantName: "Demo Tenant",
  requestorName: "Ari Chen",
  requestorRole: "Support lead",
  targetResource: "Preview editor",
  requestedScope: "preview:editor",
  reason: "Need a time-boxed preview lane.",
  status: "reviewing",
  riskScore: 48,
  requiresApproval: false,
  createdAt: "2026-05-11T12:00:00.000Z",
  expiresAt: "2026-05-11T16:00:00.000Z",
  policyPath: "preview-safe",
  cachedPolicy: true,
};

describe("evaluateRequest", () => {
  it("escalates blocked high-risk requests", () => {
    const analysis = evaluateRequest({
      ...baseRequest,
      status: "blocked",
      requestedScope: "settlement:write",
      riskScore: 97,
      cachedPolicy: false,
    });

    expect(analysis.disposition).toBe("escalate");
    expect(analysis.nextAction).toContain("security");
  });

  it("allows low-friction preview-safe requests", () => {
    const analysis = evaluateRequest(baseRequest);

    expect(analysis.disposition).toBe("allow");
    expect(analysis.rationale[0]).toContain("low-friction");
  });
});

describe("cache fallback", () => {
  it("stores and clears values by prefix", async () => {
    await cacheSet("dashboard:test", { ok: true }, 60);
    expect(await cacheGet("dashboard:test")).toEqual({ ok: true });

    await cacheDeleteByPrefix("dashboard:");
    expect(await cacheGet("dashboard:test")).toBeNull();
  });
});
