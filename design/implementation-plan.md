# Implementation Plan — Next.js app deployable on Vercel

**Venture:** au-sme-compliance (Modern Award Pay Compliance Checker)
**Date:** 2026-06-19
**Author:** builder orchestration (Claude)
**Gate context:** G4 build → G5 test → G6 deploy (deploy is a HARD human gate)
**Chosen scope (v1):** **stubs + core flow** (see Decisions)

---

## 1. Why this plan exists

[iac/vercel.json](../iac/vercel.json) is a *target* config (`framework: nextjs`, output `.next`,
functions at `src/app/api/**/*.ts`), but the repo today is **not a Next.js app**. The valuable
core — the compliance engine and framework-agnostic API handlers — exists and is tested. The
web + adapter layer that Vercel actually runs was never built. This plan builds it.

## 2. Current state (review)

**Built & solid**
- Compliance engine ([src/engine/](../src/engine/)) — pure, tested; `runComplianceCheck()` orchestrates parse → classify → gap-calc → report.
- API handlers ([src/api/routes/](../src/api/routes/)) — framework-agnostic `(ApiRequest) → ApiResponse`: uploads, awards, billing.
- Validation/errors ([src/lib/](../src/lib/)) — Zod + error envelope matching the API contract.
- Tests ([tests/](../tests/)) — 6 suites, run via `node --experimental-strip-types`.

**Missing for a working Vercel app**
1. No Next.js / no frontend / no `src/app/`.
2. No PDF generator — [reportBuilder.ts](../src/engine/reportBuilder.ts) defers to a `pdfGenerator` module that doesn't exist; `pdfkit` is an unused dep.
3. Integrations are in-memory stubs; auth is a stub accepting `valid_*` tokens.
4. ~13 of 24 contract endpoints have no handler (auth, reports list/get/download, account, admin, waitlist, billing/cancel).
5. Award data covers only 3 of 12 planned awards (data curation, gated on solicitor sign-off per PRD §5).
6. Build mismatch: `npm run build` = `tsc → dist/`, vercel.json expects `.next`.

## 3. Target for v1

- **v1 (deploys on stubs):** real Next.js app, real engine end-to-end (CSV → mapping → report → **real PDF**), landing + core flow + minimal upload history. DB/auth/billing stubbed.
- **v2 (production):** real Supabase (DB/Auth/Storage + RLS), real Stripe, remaining endpoints.

## 4. Phased plan (mapped to gates)

### Phase 1 — Next.js shell + build pipeline · G4 · builder
- Add pinned `next`/`react`/`react-dom`; `next.config.js`; `app/layout.tsx` + `app/page.tsx`; `/api/health` route.
- Resolve the `.ts`-import conflict (Risk 1): drop `.ts` extensions across `src/`+`tests/`, switch test runner to `tsx`.
- Reconcile tsconfig (Risk 2): Next-compatible config; tests still green.
- `npm run build` → `.next`; `npm run dev` works.
- **Exit:** builds & runs locally; smoke-deployable; `npm test` green.

### Phase 2 — API adapter layer · G4 · builder
- One shared adapter: Next `Request` → `ApiRequest` (auth header→`validateAuth`, body/formData/file, params) and `ApiResponse` → `Response`.
- `app/api/.../route.ts` for uploads, awards, billing. Stripe webhook = raw body (Risk 3).
- Build `pdfGenerator` (pdfkit) + `GET /api/reports/[id]/download`; thin reports list/get over `databaseClient`.

### Phase 3 — Frontend core flow · G4 · builder
- Landing (pricing + verbatim disclaimer + waitlist) → upload → column-mapping → results → PDF download → minimal history.
- Low-confidence + disclaimer banners (NFR-L2/L3).

### Phase 4 — Real integrations · G4 · builder (needs accounts/keys) — DEFERRED for v1
- Real `IDatabaseClient`/`IStorageClient` over Supabase + [supabase-config.sql](../iac/supabase-config.sql) (RLS); Supabase Auth + auth handlers; real Stripe (checkout/subscription/webhook/cancel); waitlist/account/admin endpoints.

### Phase 5 — Test gate · G5 · qa-engineer
- Keep existing tests green; add route/adapter + tenant-isolation + PDF tests; `gate.py test .` → `gates/G5-test.json`; security checklist; perf smoke.

### Phase 6 — Deploy · G6 · operator · HARD human gate
- Install vercel CLI, `vercel link`, set env from `.env.example`, `syd1`; deploy-runbook + observability + rollback; approve `gates/G6-operate.json`; `vercel --prod`.

## 5. Key risks / gotchas

1. **`.ts` import extensions** — required by `node --experimental-strip-types`, rejected by Next's bundler. Fix: extensionless imports + `tsx` test runner (touches G5 toolchain).
2. **tsconfig conflict** — tests want `NodeNext`; Next wants `bundler`/`jsx: preserve`/`noEmit`. Likely two tsconfigs.
3. **Stripe webhook raw body** — disable body parsing; verify signature on raw payload.
4. **Legal (not code):** disclaimer is `v1.0-pending-solicitor-approval`; PRD §7 requires solicitor sign-off + 200 waitlist before *public* launch. OK for private/preview deploy.
5. **Gate-protection drift:** [.claude/settings.json](../.claude/settings.json) denies `Write(ventures/**/gates/**)`, but gates here are at `./gates/` after the remap — rule doesn't bite. Fix if the gated discipline must hold.

## 6. Decisions

| Decision | Choice (v1) |
|---|---|
| Integrations depth | **Stubs** (no external accounts needed to deploy) |
| Frontend depth | **Core flow** (upload→mapping→results→PDF) + minimal history |

## 7. Branch

`feat/nextjs-vercel-app`
