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

## Recurring obligations
- FWC award rate-table refresh each July (rates are data, not code — PRD US-08).
- Employment-solicitor sign-off on disclaimer + each new award before public launch.
- Dependency/security patching (note: a transitive `postcss` advisory rides with
  Next.js 15.x — re-check on Next upgrades).
