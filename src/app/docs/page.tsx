import Link from "next/link";

const localRun = `npm install
npm run dev`;

const envExample = `SESSION_SECRET=replace-this
DATABASE_URL=postgres://postgres:postgres@localhost:5432/tenant_access_control_plane
REDIS_URL=redis://localhost:6379
OIDC_ISSUER=https://your-idp.example.com
OIDC_CLIENT_ID=tenant-access-control-plane
OIDC_CLIENT_SECRET=replace-this`;

const graphqlQuery = `query DashboardSnapshot {
  dashboardSummary {
    cacheMode
    metrics {
      label
      value
      change
    }
  }
}`;

export default function DocsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 md:px-6">
      <section className="section-frame panel-glow rounded-[2.2rem] px-6 py-8 md:px-8">
        <p className="eyebrow text-[var(--accent-cyan)]">Docs</p>
        <h1 className="mt-4 text-4xl font-semibold">
          Tenant Access Control Plane
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--ink-secondary)]">
          Full-stack Next.js flagship with GraphQL, a Postgres-compatible data layer, Redis-ready cache, signed demo sessions, CI, and deploy assets.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href="/"
            className="rounded-full border border-[var(--line-soft)] bg-white/5 px-4 py-2 hover:bg-white/8"
          >
            Back to control plane
          </Link>
          <a
            href="/api/graphql"
            className="rounded-full border border-[var(--line-soft)] bg-white/5 px-4 py-2 hover:bg-white/8"
          >
            Open GraphQL endpoint
          </a>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="section-frame rounded-[2rem] px-6 py-6">
          <p className="eyebrow text-[var(--accent-gold)]">One-shot local run</p>
          <pre className="code-card mt-5 rounded-[1.6rem] p-5 text-sm leading-7">
            {localRun}
          </pre>
          <p className="mt-4 text-sm leading-6 text-[var(--ink-secondary)]">
            No external services are required for the default local experience. The repo falls back to an embedded Postgres-compatible runtime and an in-memory cache when Postgres and Redis are not configured.
          </p>
        </article>

        <article className="section-frame rounded-[2rem] px-6 py-6">
          <p className="eyebrow text-[var(--accent-gold)]">Optional production env</p>
          <pre className="code-card mt-5 rounded-[1.6rem] p-5 text-sm leading-7">
            {envExample}
          </pre>
          <p className="mt-4 text-sm leading-6 text-[var(--ink-secondary)]">
            With `DATABASE_URL` and `REDIS_URL` set, the same code path moves from local-first runtime to real Postgres and Redis with no feature loss.
          </p>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="section-frame rounded-[2rem] px-6 py-6">
          <p className="eyebrow text-[var(--accent-cyan)]">GraphQL snapshot</p>
          <pre className="code-card mt-5 rounded-[1.6rem] p-5 text-sm leading-7">
            {graphqlQuery}
          </pre>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-white/4 p-4">
              <p className="text-base font-semibold">Mutation surface</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">
                `updateRequestStatus` threads operator decisions back into the policy timeline.
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white/4 p-4">
              <p className="text-base font-semibold">Data model</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">
                Tenants, memberships, access requests, and policy events sit behind the same typed contract.
              </p>
            </div>
          </div>
        </article>

        <article className="section-frame rounded-[2rem] px-6 py-6">
          <p className="eyebrow text-[var(--accent-cyan)]">What this proves</p>
          <div className="mt-5 space-y-4">
            {[
              "Mainstream full-stack app depth",
              "Typed API contract fluency",
              "Postgres and Redis shaped architecture",
              "OIDC-ready auth posture",
              "Tests, CI, Docker, Kubernetes, and Helm in one repo",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-4"
              >
                <p className="text-sm leading-6 text-[var(--ink-secondary)]">{item}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
