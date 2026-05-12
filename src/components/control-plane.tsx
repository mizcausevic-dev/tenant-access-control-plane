"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  Boxes,
  Cloud,
  DatabaseZap,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";

import type {
  AccessRequestSnapshot,
  DashboardSnapshot,
  PersonaSummary,
  RequestAnalysis,
  RequestStatus,
  TimelineEvent,
} from "@/lib/domain/types";
import { useControlPlaneStore } from "@/lib/store/use-control-plane-store";

type ControlPlaneProps = {
  personas: PersonaSummary[];
};

function toneClass(status: RequestStatus) {
  switch (status) {
    case "approved":
      return "bg-emerald-500/12 text-emerald-200 ring-1 ring-emerald-500/20";
    case "blocked":
      return "bg-rose-500/12 text-rose-200 ring-1 ring-rose-500/20";
    case "pending-approval":
      return "bg-amber-400/12 text-amber-100 ring-1 ring-amber-400/20";
    default:
      return "bg-cyan-400/12 text-cyan-100 ring-1 ring-cyan-400/20";
  }
}

function analyzeRequest(request: AccessRequestSnapshot) {
  if (request.riskScore >= 90 || request.status === "blocked") {
    return {
      label: "Escalate",
      tone: "text-rose-200",
      summary: "Multi-owner signoff required before widening the tenant boundary.",
    };
  }

  if (request.riskScore >= 60 || request.requiresApproval) {
    return {
      label: "Hold",
      tone: "text-amber-100",
      summary: "Owner acknowledgement needed before the elevation can move.",
    };
  }

  return {
    label: "Allow",
    tone: "text-emerald-200",
    summary: "Request fits a low-friction lane with an audit snapshot already attached.",
  };
}

async function postGraphql<T>(query: string, variables?: Record<string, unknown>) {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json()) as { data?: T; errors?: unknown };

  if (!response.ok || payload.errors) {
    throw new Error("GraphQL request failed");
  }

  return payload.data as T;
}

export function ControlPlane({ personas }: ControlPlaneProps) {
  const {
    selectedRequestId,
    setSelectedRequestId,
    surfaceMode,
    setSurfaceMode,
  } = useControlPlaneStore();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [requests, setRequests] = useState<AccessRequestSnapshot[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [viewerName, setViewerName] = useState("Loading operator");
  const [viewerTitle, setViewerTitle] = useState("Fetching tenant posture");
  const [pending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await postGraphql<{ dashboardSummary: DashboardSnapshot }>(
          `
            query DashboardSummary {
              dashboardSummary {
                viewer { id name title focus authMode issuer }
                cacheMode
                authStatus
                metrics { label value change tone note }
                tenants {
                  id
                  name
                  region
                  tier
                  identityProvider
                  riskLevel
                  seatUtilization
                  approvalLatencyHours
                }
                requests {
                  id
                  tenantId
                  tenantName
                  requestorName
                  requestorRole
                  targetResource
                  requestedScope
                  reason
                  status
                  riskScore
                  requiresApproval
                  createdAt
                  expiresAt
                  policyPath
                  cachedPolicy
                }
                timeline {
                  id
                  requestId
                  stage
                  owner
                  outcome
                  note
                  createdAt
                }
                deploymentAssets { label path summary }
                testSignals { label summary status }
                graphqlPreview
              }
            }
          `,
        );

        setSnapshot(data.dashboardSummary);
        setRequests(data.dashboardSummary.requests);
        setTimeline(data.dashboardSummary.timeline);
        setViewerName(data.dashboardSummary.viewer.name);
        setViewerTitle(data.dashboardSummary.viewer.title);
        setLoadError(null);
        if (!selectedRequestId && data.dashboardSummary.requests[0]) {
          setSelectedRequestId(data.dashboardSummary.requests[0].id);
        }
      } catch {
        setLoadError("Control plane data could not be loaded.");
      }
    })();
  }, [selectedRequestId, setSelectedRequestId]);

  useEffect(() => {
    if (!selectedRequestId && requests[0]) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId, setSelectedRequestId]);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? requests[0] ?? null,
    [requests, selectedRequestId],
  );

  const selectedTimeline = useMemo(
    () =>
      selectedRequest
        ? timeline.filter((event) => event.requestId === selectedRequest.id)
        : ([] as TimelineEvent[]),
    [selectedRequest, timeline],
  );

  const recommendation = selectedRequest ? analyzeRequest(selectedRequest) : null;

  const switchPersona = (personaId: string, personaName: string, personaTitle: string) => {
    startTransition(async () => {
      await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ personaId }),
      });

      setViewerName(personaName);
      setViewerTitle(personaTitle);
      window.location.reload();
    });
  };

  const updateRequest = (status: RequestStatus) => {
    if (!selectedRequest) {
      return;
    }

    startTransition(async () => {
      const data = await postGraphql<{
        updateRequestStatus: {
          request: AccessRequestSnapshot;
          analysis: RequestAnalysis;
          timeline: TimelineEvent[];
        };
      }>(
        `
          mutation UpdateRequestStatus($id: String!, $status: String!, $owner: String!) {
            updateRequestStatus(id: $id, status: $status, owner: $owner) {
              request {
                id
                status
                riskScore
                tenantName
                requestorName
                requestorRole
                targetResource
                requestedScope
                reason
                tenantId
                requiresApproval
                createdAt
                expiresAt
                policyPath
                cachedPolicy
              }
              timeline {
                id
                requestId
                stage
                owner
                outcome
                note
                createdAt
              }
            }
          }
        `,
        {
          id: selectedRequest.id,
          status,
          owner: viewerName,
        },
      );

      setRequests((current) =>
        current.map((request) =>
          request.id === selectedRequest.id
            ? { ...request, status }
            : request,
        ),
      );
      setTimeline((current) => [
        ...(data.updateRequestStatus?.timeline ?? []),
        ...current.filter((event) => event.requestId !== selectedRequest.id),
      ]);
    });
  };

  if (!snapshot) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <div className="section-frame panel-glow rounded-[2rem] px-8 py-8 text-center">
          <p className="eyebrow text-[var(--accent-cyan)]">Loading</p>
          <h1 className="mt-4 text-3xl font-semibold">Tenant Access Control Plane</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--ink-secondary)]">
            {loadError ??
              "Hydrating the control plane from the GraphQL contract and local-first data runtime."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-[1580px] gap-6 px-4 py-5 lg:grid-cols-[290px_minmax(0,1fr)] xl:px-6">
      <aside className="section-frame panel-glow scroll-shell sticky top-4 flex h-[calc(100vh-2rem)] flex-col overflow-y-auto rounded-[2rem] p-5">
        <div className="rounded-[1.5rem] border border-white/6 bg-white/3 p-4">
          <p className="eyebrow text-[var(--accent-cyan)]">Tenant Rail</p>
          <h1 className="mt-4 text-2xl font-semibold leading-tight">
            Tenant Access
            <br />
            Control Plane
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-secondary)]">
            Role-aware elevation flows, GraphQL contract fluency, and production-shaped delivery assets in one flagship repo.
          </p>
        </div>

        <div className="mt-6">
          <p className="eyebrow text-[var(--ink-muted)]">Active operator</p>
          <div className="mt-3 rounded-[1.5rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-4">
            <p className="text-lg font-semibold">{viewerName}</p>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">{viewerTitle}</p>
            <p className="mt-3 text-sm text-[var(--ink-muted)]">{snapshot.viewer.focus}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <p className="eyebrow text-[var(--ink-muted)]">Demo personas</p>
          {personas.map((persona) => (
            <button
              key={persona.id}
              type="button"
              onClick={() => switchPersona(persona.id, persona.name, persona.title)}
              className="w-full rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-card)] px-4 py-3 text-left transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-card-strong)]"
            >
              <p className="text-sm font-semibold">{persona.name}</p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">{persona.title}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <p className="eyebrow text-[var(--ink-muted)]">Surface modes</p>
          {[
            { key: "overview", label: "Overview", icon: ShieldCheck },
            { key: "graphql", label: "GraphQL", icon: Sparkles },
            { key: "deploy", label: "Deploy", icon: Cloud },
            { key: "anatomy", label: "Anatomy", icon: Boxes },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSurfaceMode(key as typeof surfaceMode)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                surfaceMode === key
                  ? "bg-[var(--surface-card-strong)] text-[var(--ink-primary)] ring-1 ring-[var(--line-strong)]"
                  : "bg-transparent text-[var(--ink-secondary)] hover:bg-white/3"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 grow">
          <p className="eyebrow text-[var(--ink-muted)]">Decision queue</p>
          <div className="mt-3 space-y-3">
            {requests.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => setSelectedRequestId(request.id)}
                className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${
                  selectedRequest?.id === request.id
                    ? "border-cyan-300/30 bg-cyan-300/8"
                    : "border-[var(--line-soft)] bg-[var(--surface-card)] hover:border-[var(--line-strong)]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{request.tenantName}</p>
                    <p className="mt-1 text-sm text-[var(--ink-secondary)]">
                      {request.targetResource}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(request.status)}`}>
                    {request.status}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-[var(--ink-muted)]">
                  <span>{request.requestedScope}</span>
                  <span>Risk {request.riskScore}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="scroll-shell flex min-h-screen flex-col gap-6 overflow-y-auto pb-12">
        <section className="section-frame panel-glow rounded-[2.25rem] px-6 py-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow text-[var(--accent-cyan)]">Access governance flagship</p>
              <h2 className="mt-4 max-w-5xl text-4xl font-semibold leading-tight lg:text-[3.6rem]">
                Tenant boundaries, auth posture, cache discipline, and delivery proof in one system.
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--ink-secondary)]">
                This is the mainstream bridge in the portfolio: Next.js, GraphQL, Postgres-compatible data, Redis-ready cache, OIDC-shaped auth, CI, tests, and deploy assets.
              </p>
            </div>
            <div className="grid gap-3 rounded-[1.75rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-4 text-sm text-[var(--ink-secondary)] lg:min-w-[340px]">
              <div className="flex items-center justify-between">
                <span>Auth posture</span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-[var(--ink-primary)]">
                  {snapshot.authStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cache lane</span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-[var(--ink-primary)]">
                  {snapshot.cacheMode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>GraphQL surface</span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-[var(--ink-primary)]">
                  /api/graphql
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-4">
            {snapshot.metrics.map((metric) => (
              <div key={metric.label} className="metric-card rounded-[1.75rem] px-5 py-5">
                <p className="eyebrow text-[var(--ink-muted)]">{metric.label}</p>
                <p className="mt-4 text-5xl font-semibold text-[var(--accent-gold)]">
                  {metric.value}
                </p>
                <p
                  className={`mt-3 text-sm font-medium ${
                    metric.tone === "critical"
                      ? "text-rose-200"
                      : metric.tone === "warning"
                        ? "text-amber-100"
                        : metric.tone === "positive"
                          ? "text-emerald-200"
                          : "text-[var(--ink-secondary)]"
                  }`}
                >
                  {metric.change}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{metric.note}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="section-frame panel-glow rounded-[2rem] px-6 py-6 lg:px-8">
            {surfaceMode === "overview" && (
              <div className="space-y-8">
                <div>
                  <p className="eyebrow text-[var(--accent-gold)]">Request matrix</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {requests.map((request) => (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => setSelectedRequestId(request.id)}
                        className="rounded-[1.7rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-5 text-left transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-card-strong)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-lg font-semibold">{request.targetResource}</p>
                            <p className="mt-1 text-sm text-[var(--ink-secondary)]">
                              {request.tenantName}
                            </p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(request.status)}`}>
                            {request.status}
                          </span>
                        </div>
                        <p className="mt-5 text-sm leading-6 text-[var(--ink-secondary)]">
                          {request.reason}
                        </p>
                        <div className="mt-5 flex items-center justify-between text-xs text-[var(--ink-muted)]">
                          <span>{request.requestorName}</span>
                          <span>Risk {request.riskScore}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="eyebrow text-[var(--accent-cyan)]">Tenant posture</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {snapshot.tenants.map((tenant) => (
                      <article
                        key={tenant.id}
                        className="rounded-[1.7rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-5"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-lg font-semibold">{tenant.name}</p>
                            <p className="mt-1 text-sm text-[var(--ink-muted)]">
                              {tenant.identityProvider}
                            </p>
                          </div>
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-[var(--ink-secondary)]">
                            {tenant.region}
                          </span>
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                          <div className="rounded-2xl bg-white/4 p-4">
                            <p className="text-[var(--ink-muted)]">Tier</p>
                            <p className="mt-2 font-semibold">{tenant.tier}</p>
                          </div>
                          <div className="rounded-2xl bg-white/4 p-4">
                            <p className="text-[var(--ink-muted)]">Risk</p>
                            <p className="mt-2 font-semibold">{tenant.riskLevel}</p>
                          </div>
                          <div className="rounded-2xl bg-white/4 p-4">
                            <p className="text-[var(--ink-muted)]">Seat load</p>
                            <p className="mt-2 font-semibold">{tenant.seatUtilization}%</p>
                          </div>
                          <div className="rounded-2xl bg-white/4 p-4">
                            <p className="text-[var(--ink-muted)]">Approval drag</p>
                            <p className="mt-2 font-semibold">{tenant.approvalLatencyHours}h</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {surfaceMode === "graphql" && (
              <div className="space-y-8">
                <div>
                  <p className="eyebrow text-[var(--accent-cyan)]">GraphQL contract</p>
                  <h3 className="mt-4 text-3xl font-semibold">
                    The control plane speaks in typed governance snapshots, not ad-hoc JSON fragments.
                  </h3>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--ink-secondary)]">
                    GraphQL is wired beside the app shell so the same repo proves UI fluency and contract fluency. The query below is already usable against the local demo API.
                  </p>
                </div>
                <pre className="code-card overflow-x-auto rounded-[1.8rem] p-6 text-sm leading-7">
                  {snapshot.graphqlPreview}
                </pre>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[1.7rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-5">
                    <Sparkles className="h-5 w-5 text-[var(--accent-gold)]" />
                    <p className="mt-5 text-lg font-semibold">Role-aware mutations</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">
                      `updateRequestStatus` threads human owner decisions back into the policy timeline.
                    </p>
                  </div>
                  <div className="rounded-[1.7rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-5">
                    <DatabaseZap className="h-5 w-5 text-[var(--accent-cyan)]" />
                    <p className="mt-5 text-lg font-semibold">Cache-conscious reads</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">
                      Dashboard snapshots ride a Redis-ready cache layer without changing the query surface.
                    </p>
                  </div>
                  <div className="rounded-[1.7rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-5">
                    <ShieldCheck className="h-5 w-5 text-[var(--accent-mint)]" />
                    <p className="mt-5 text-lg font-semibold">OIDC-shaped viewers</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">
                      Signed demo sessions show how operator context would ride through a real OIDC bridge.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {surfaceMode === "deploy" && (
              <div className="space-y-8">
                <div>
                  <p className="eyebrow text-[var(--accent-gold)]">Delivery surface</p>
                  <h3 className="mt-4 text-3xl font-semibold">
                    Local-first by default, production-shaped when Postgres, Redis, and Kubernetes show up.
                  </h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {snapshot.deploymentAssets.map((asset) => (
                    <article
                      key={asset.label}
                      className="rounded-[1.7rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-lg font-semibold">{asset.label}</p>
                        <ArrowRight className="h-4 w-4 text-[var(--ink-muted)]" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-[var(--accent-cyan)]">
                        {asset.path}
                      </p>
                      <p className="mt-4 text-sm leading-6 text-[var(--ink-secondary)]">
                        {asset.summary}
                      </p>
                    </article>
                  ))}
                </div>
                <div className="rounded-[1.9rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-6">
                  <p className="eyebrow text-[var(--accent-cyan)]">Quality gates</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    {snapshot.testSignals.map((signal) => (
                      <div key={signal.label} className="rounded-[1.5rem] bg-white/4 p-4">
                        <p className="text-base font-semibold">{signal.label}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">
                          {signal.summary}
                        </p>
                        <p className="mt-4 text-xs uppercase tracking-[0.24em] text-[var(--ink-muted)]">
                          {signal.status}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {surfaceMode === "anatomy" && (
              <div className="space-y-8">
                <div>
                  <p className="eyebrow text-[var(--accent-cyan)]">Repo anatomy</p>
                  <h3 className="mt-4 text-3xl font-semibold">
                    A mainstream stack flagship that closes the biggest broad-appeal gaps in the portfolio.
                  </h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    "Next.js App Router + Tailwind shell",
                    "Drizzle with Postgres-compatible local runtime",
                    "GraphQL Yoga contract surface",
                    "Signed demo OIDC session cookies",
                    "Redis-ready cache fallback",
                    "Vitest + Playwright + GitHub Actions",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[1.6rem] border border-[var(--line-soft)] bg-[var(--surface-card)] px-5 py-4"
                    >
                      <p className="text-sm font-medium text-[var(--ink-secondary)]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="section-frame panel-glow rounded-[2rem] px-5 py-5">
            {selectedRequest && recommendation ? (
              <div className="space-y-6">
                <div className="rounded-[1.7rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-5">
                  <p className="eyebrow text-[var(--accent-gold)]">Selected request</p>
                  <h3 className="mt-4 text-2xl font-semibold">
                    {selectedRequest.targetResource}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--ink-secondary)]">
                    {selectedRequest.reason}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white/4 p-3">
                      <p className="text-[var(--ink-muted)]">Requestor</p>
                      <p className="mt-1 font-semibold">{selectedRequest.requestorName}</p>
                    </div>
                    <div className="rounded-2xl bg-white/4 p-3">
                      <p className="text-[var(--ink-muted)]">Scope</p>
                      <p className="mt-1 font-semibold">{selectedRequest.requestedScope}</p>
                    </div>
                    <div className="rounded-2xl bg-white/4 p-3">
                      <p className="text-[var(--ink-muted)]">Policy path</p>
                      <p className="mt-1 font-semibold">{selectedRequest.policyPath}</p>
                    </div>
                    <div className="rounded-2xl bg-white/4 p-3">
                      <p className="text-[var(--ink-muted)]">Risk score</p>
                      <p className="mt-1 font-semibold">{selectedRequest.riskScore}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.7rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-5">
                  <p className="eyebrow text-[var(--accent-cyan)]">Recommendation</p>
                  <p className={`mt-4 text-3xl font-semibold ${recommendation.tone}`}>
                    {recommendation.label}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[var(--ink-secondary)]">
                    {recommendation.summary}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => updateRequest("approved")}
                      disabled={pending}
                      className="rounded-full bg-emerald-400/16 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/22 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequest("pending-approval")}
                      disabled={pending}
                      className="rounded-full bg-amber-300/16 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-300/24 disabled:opacity-50"
                    >
                      Hold
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequest("blocked")}
                      disabled={pending}
                      className="rounded-full bg-rose-400/16 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-400/24 disabled:opacity-50"
                    >
                      Escalate
                    </button>
                  </div>
                </div>

                <div className="rounded-[1.7rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-5">
                  <div className="flex items-center gap-3">
                    <TimerReset className="h-4 w-4 text-[var(--accent-cyan)]" />
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                      Timeline
                    </p>
                  </div>
                  <div className="mt-5 space-y-5">
                    {selectedTimeline.map((event) => (
                      <div key={event.id} className="rail-dot relative pl-1">
                        <p className="text-sm font-semibold">{event.stage}</p>
                        <p className="mt-1 text-xs text-[var(--ink-muted)]">
                          {event.owner} · {event.outcome}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">
                          {event.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="code-card rounded-[1.7rem] p-5 text-sm leading-7">
                  <p className="text-[var(--accent-mint)]">&gt; GraphQL mutation</p>
                  <pre className="mt-3 whitespace-pre-wrap">
{`mutation {
  updateRequestStatus(
    id: "${selectedRequest.id}",
    status: "approved",
    owner: "${viewerName}"
  ) { request { id status } }
}`}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.7rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-6">
                <p className="text-lg font-semibold">No request selected</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
