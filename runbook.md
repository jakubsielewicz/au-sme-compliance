# Runbook — au-sme-compliance

## Deploy (Option A — stub preview on Vercel)

This deploys the v1 build (real engine + UI, **stubbed** DB/auth/billing) to Vercel.
No external accounts or secrets are required for it to run.

### Prerequisites
- `vercel` CLI installed (done: v54+). `node >= 20`, `npm >= 10`.
- You run these from **your own terminal** at the repo root. (The in-repo agent
  hooks block `vercel --prod` in-session — see "Gating note" below — so the deploy
  is human-run by design.)

### Steps
```bash
# from repo root, on feat/nextjs-vercel-app (or after merge to main)
vercel login          # interactive (browser) — one-time
vercel link           # create/link the project; accept root dir "./", framework = Next.js (auto)
vercel                # preview deploy → prints a https://<project>-<hash>.vercel.app URL
# when you're happy:
vercel --prod         # production deploy
```

### Env vars
None are **required** for the stub build to run. Optional:
| Var | Needed? | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | optional | `vercel.json` build env hardcodes the prod domain; override per-env if desired |
| `STRIPE_WEBHOOK_SECRET` | optional | only exercises the webhook path; the stub only accepts signature `stub_valid` |

Set via `vercel env add <NAME> <production|preview>` or the dashboard. Real keys
come in Phase 4 (see `.env.example` — do not commit real values).

### Post-deploy smoke check
1. `GET https://<url>/api/health` → `{"status":"ok"}`
2. Open `/` (landing), `/check`, `/history` — pages render.
3. On `/check`: download the sample CSV, pick **Hospitality (MA000009)**, upload,
   confirm the auto-mapped columns, run the check. Expect **6 employees, 6 gaps,
   ~$355.51/wk**, a per-employee table, and a working **Download PDF**.

### Known limitations of this preview
- **In-memory state is per warm instance.** The upload→mapping→download flow works
  on a warm Vercel instance but will lose state across cold starts / concurrent
  requests. Treat this as a **private preview**, not a shared/production app. Phase 4
  (real Supabase) removes this limitation.
- `vercel.json` has a redirect for host `app.paycheck.com.au` → `/dashboard` (a route
  that doesn't exist yet). It won't fire on `*.vercel.app`; ignore for preview.
- The report disclaimer is `v1.0-pending-solicitor-approval`. Do **not** present this
  as a finished product until legal sign-off (PRD §7).

### Rollback
- `vercel rollback <previous-deployment-url>`, or promote a prior deployment in the
  Vercel dashboard. Each deploy is immutable, so rollback is instant.

## Gating note (factory hooks vs this repo)
`.claude/hooks/guard.py` and `gate.py` are wired for the factory layout
(`ventures/<slug>/...`). In this flattened repo they don't resolve a venture, so:
- `gate.py test .` won't write `gates/G5-test.json` (no `ventures/` dir).
- `guard.py` **denies** in-session `vercel --prod` / `vercel deploy` (no active venture, fails closed).
Agent hooks apply only to the agent's own tool calls — deploying from your terminal
is unaffected. To restore the gated discipline here, the hooks need adapting to the
flat layout (tracked as a follow-up).

## Phase 4a — Supabase setup

Phase 4a wires the real Supabase Postgres + Storage behind an env-gate. When the
env vars below are absent the app silently uses the in-memory stubs — local dev and
CI tests require zero credentials.

### Required environment variables (server-side only)

| Var | Notes |
|---|---|
| `SUPABASE_URL` | Project URL, e.g. `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role JWT — server-side only, never expose to the browser. Bypasses RLS. |

Coming in Phase 4b (not needed yet):
- `SUPABASE_ANON_KEY` — used by browser clients for public/anon queries
- `SUPABASE_JWT_SECRET` — used by auth middleware to verify user JWTs

Set via `vercel env add <NAME> production` for the Vercel deployment, or in your
local shell for manual testing. Do NOT commit values to any file.

### Apply the schema

```bash
# 1. Apply schema (idempotent — uses IF NOT EXISTS / IF NOT EXISTS guards)
psql $SUPABASE_DB_URL -f iac/supabase-config.sql

# 2. Seed demo user + account (idempotent — ON CONFLICT DO NOTHING)
psql $SUPABASE_DB_URL -f iac/supabase-seed.sql
```

`SUPABASE_DB_URL` is the direct Postgres connection string from the Supabase dashboard
(Settings → Database → Connection string → URI mode).

Alternatively use the Supabase CLI:
```bash
supabase db push --db-url $SUPABASE_DB_URL
```

### Storage buckets

Create two **private** buckets in the Supabase dashboard (Storage tab) or via the
Supabase CLI before deploying:

| Bucket | Visibility |
|---|---|
| `uploads` | Private |
| `reports` | Private |

Private means no public URL access — signed URLs are generated on-demand by the API
(`getSignedUrl`) when a download is requested.

### Tenant isolation

The service-role key bypasses Row Level Security. Tenant scoping is enforced at the
API layer: every database query in `src/integrations/supabase.real.ts` filters by
`account_id`. RLS policies (defined in `iac/supabase-config.sql`) are defense-in-depth
for Phase 4b when API routes switch to user JWTs.

### Smoke check with real Supabase

After setting env vars and applying schema + seed:
1. `GET /api/health` → `{"status":"ok"}`
2. POST a CSV upload, confirm it persists across separate requests and cold starts.
3. Check the Supabase dashboard → Table Editor → `uploads` and `reports` rows appear.

### Fallback / local dev

With no `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` in the environment, the factory
in `src/integrations/store.ts` automatically selects the in-memory stubs. No config
changes needed for local dev or CI.

## Recurring obligations
- FWC award rate-table refresh each July (rates are data, not code — PRD US-08).
- Employment-solicitor sign-off on disclaimer + each new award before public launch.
- Dependency/security patching (note: a transitive `postcss` advisory rides with
  Next.js 15.x — re-check on Next upgrades).
