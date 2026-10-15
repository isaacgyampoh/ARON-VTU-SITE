# Production recovery: Vercel → Cloudflare Workers

**Status: `chaledata.com` and `www.chaledata.com` are live on Cloudflare
Workers over HTTPS, serving the real storefront from the production database.**
The home page, `/detail/[code]` and the sitemap all render real plans and
prices. Supabase is connected; its 812 orders and 104 customers are untouched.

**One gap remains: the two Paystack keys are not set, so checkout cannot take
payment.** Everything else — browsing, order tracking, the admin — works. See
[What is still needed](#what-is-still-needed).

## Why production went down

Two separate failures, both confirmed:

1. **Vercel disabled the deployment.** Every route — apex, `www`, and the
   `.vercel.app` hostname — returned `HTTP 402` with `x-vercel-error:
   DEPLOYMENT_DISABLED`. The project (`prj_5T4kuJGgCYk61xfFlZCGnXD1wsAq`,
   team `isaacs-projects-7cdab31a`) reports `live: false`. The last production
   deployment itself built fine and is `READY` — it is the project that is
   switched off, which is a billing state, not a build failure.

2. **The DNS records are gone.** `chaledata.com` is a Cloudflare zone on the
   Free plan, active on `ram`/`robin` nameservers, and it has **zero** DNS
   records. `www.chaledata.com` does not resolve at all. The apex only still
   answered during the investigation because resolvers were serving a cached
   Vercel address.

So even paying the Vercel bill would not have brought the site back on its own.

A third problem was waiting behind those two: a large, finished security
refactor was sitting uncommitted in the working tree and had never been
deployed. It renames the server-only environment variables off their
`NEXT_PUBLIC_` prefixes, so the variables stored in Vercel no longer match what
the code reads. It is now commit `9481674`.

## What the application actually is

Next.js 16 App Router, full-stack. Not a static site and it cannot be made one:

- 16 API route handlers, every one `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`.
- A proxy (`src/proxy.ts`, Next 16's middleware) that gates `/admin` and
  `/api/admin/*` using an HMAC session cookie.
- ISR: `revalidate = 60` on the home page, `/detail/[code]` and the sitemap.
- Supabase (service role, server-side only) for networks, plans, orders and customers.
- Paystack for payment, with a signed webhook that fulfils orders through the
  xpresportal vendor API.
- `node:crypto` in the proxy and the webhook — HMAC-SHA256, HMAC-SHA512,
  `timingSafeEqual`.

## The hosting choice

**`@opennextjs/cloudflare` 1.20.12 on Cloudflare Workers with Static Assets.**

Cloudflare's docs now recommend `vinext` for Next.js. It was rejected here:
vinext is a *reimplementation* of the Next.js API surface on Vite, described by
its own site as around 94% API coverage and by reviewers as beta. This
application takes real payments; the OpenNext adapter wraps the output of an
ordinary `next build`, so the app stays actual Next.js. That is the right
trade for a production storefront.

This required **Next 16.2.6 → 16.4.1** (and React 19.2.4 → 19.2.6). The adapter
declares `next: ">=15.5.28 <16 || >=16.4.1"`, so 16.2.6 fell in the unsupported
gap. 16.4.1 is the current stable release.

### Deliberate configuration decisions

| Decision | Reason |
| --- | --- |
| `nodejs_compat` | The admin session HMAC and the Paystack webhook signature both use `node:crypto`. |
| No `images` binding | Nothing uses `next/image`; the network logos are static files in `public/networks`. Removing it avoids Cloudflare Images usage and cost entirely. |
| No incremental cache (R2/KV) | The supplied API token has no R2 or KV permission. ISR still works — each isolate just keeps its own copy and revalidates on its own 60s clock. See [Remaining limitations](#remaining-limitations). |
| Apex is canonical | `metadataBase`, `robots.ts` and `sitemap.ts` all point at `https://chaledata.com`. Vercel had `www` primary with the apex redirecting; that is now inverted to match the code. |

## What was verified, not assumed

Tested against the real `workerd` runtime locally, then again on the deployed
Worker. A build succeeding was not treated as proof of anything.

| Check | Result |
| --- | --- |
| `/`, `/cresco`, `/order`, `/robots.txt`, `/sitemap.xml` | 200 |
| Unknown path | 404 via the app's own `not-found` |
| `/admin`, `/admin/orders` anonymous | 307 → `/admin/login`, with `?next=` preserved |
| `/api/admin/*`, `/api/vendor` anonymous | 401 JSON |
| Login, wrong password | 401 |
| Login, correct password | 200, httpOnly session cookie |
| `/admin`, `/api/admin/stats` with that cookie | 200 |
| Tampered session cookie | 307 / 401 — signature rejected |
| Webhook, bad signature | 401 |
| Webhook, valid HMAC-SHA512 over a non-existent reference | 200 `{received:true}` |
| Checkout, empty body / bad phone | 400 with the right message |

That last pair is the important one: it proves `node:crypto` works under
`nodejs_compat`, in both the proxy and a route handler. The OpenNext build
prints a warning that Node.js middleware on Cloudflare is experimental — it was
therefore tested directly rather than taken on trust, and it behaves correctly.

No real payment was made, no customer record was touched, and nothing was
written to the database at any point.

## What is still needed

Vercel stored all six environment variables as **sensitive**, which Vercel
never allows to be read back — not through the API, not in the dashboard. The
disabled deployment no longer serves its build output either, so the values
inlined into the old client bundle are unreachable too. They are not in git
history. They are genuinely unrecoverable and must come from the source
dashboards:

| Variable | Status |
| --- | --- |
| `SUPABASE_URL` | **Done.** Recovered through the Supabase Management API against the "Aaron Data" project. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Done.** Same route; set as a Worker secret. |
| `ADMIN_PASSWORD` | **Done.** Generated fresh — see `.admin-credentials.txt`. |
| `ADMIN_SESSION_SECRET` | **Done.** Generated fresh. |
| `PAYSTACK_SECRET_KEY` | **Still needed.** Paystack → Settings → API Keys & Webhooks (`sk_live_…`). |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | **Still needed.** Same screen (`pk_live_…`). Inlined at build time, so it needs a rebuild, not just a secret. |

Also check that the Paystack webhook URL points at
`https://chaledata.com/api/webhook` — it will still be aimed at the old Vercel
deployment, and paid orders are only fulfilled when that webhook arrives.

**To finish:** fill in `.secrets-to-fill.env` (gitignored) and run

```sh
./scripts/finish-recovery.sh
```

It checks the Supabase credentials with a read-only query first, uploads the
runtime secrets, rebuilds (the `NEXT_PUBLIC_*` values are inlined at build time
and the prerendered pages read the database), redeploys, re-runs the checks
above against the new deployment, and only then points `chaledata.com` and
`www.chaledata.com` at the Worker. If any check fails it stops and leaves DNS
untouched.

## Rollback

- **Cloudflare:** every deploy is a version. `npx wrangler rollback --name aron-vtu`
  returns to the previous one. `npx wrangler deployments list --name aron-vtu` shows them.
- **Git:** tag `pre-cloudflare-checkpoint` marks the tree as found (`c112520`).
  A full bundle of every ref was taken before any change.
- **Vercel:** the project, its domains and its deployment history were left
  exactly as they were. Nothing there was deleted, renamed or unpaused. If the
  bill is settled it can be switched back on, and DNS pointed back, at any time.
- **DNS:** the zone had no records to overwrite, so the cutover added records
  rather than replacing any. No email, verification or business-service record
  existed in this zone to disturb. The two records now present are the proxied
  `AAAA 100::` placeholders Cloudflare creates for a Worker custom domain:

  | Record | Name | Target |
  | --- | --- | --- |
  | AAAA (proxied) | `chaledata.com` | Worker `aron-vtu` |
  | AAAA (proxied) | `www.chaledata.com` | Worker `aron-vtu` |

  To hand the domain back to Vercel, detach both custom domains from the
  Worker and recreate the Vercel A records.

## Remaining limitations

- **No shared ISR cache.** The API token has no R2 or KV permission, so
  `open-next.config.ts` has no `incrementalCache` override. ISR is correct but
  per-isolate. To fix: give the token R2 permission, create a bucket, add a
  `NEXT_INC_CACHE_R2_BUCKET` binding and uncomment `r2IncrementalCache`. R2's
  free tier covers this workload.
- **Rate limiting is per-isolate.** `src/lib/rate-limit.ts` is an in-memory
  map, which on Workers means per isolate rather than global — the same
  caveat it had on Vercel, and the comment in the file already says so.
  Checkout's per-phone limit in the database is unaffected.
- **Node.js middleware is experimental** on this adapter. It is tested and
  working. If a future adapter release regresses it, the fallback is to move
  `verifySessionToken` from `node:crypto` to WebCrypto and make the proxy async.
- **`www` does not redirect to the apex.** The token has no Rulesets
  permission, so a Single Redirect could not be created. Both hostnames serve
  the app; `metadataBase` keeps the canonical tag on the apex.
- **Automated deploys need one authorization.** `.github/workflows/deploy.yml`
  deploys on push to `main`, but needs five repository secrets added under
  Settings → Secrets and variables → Actions: `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`.

## Costs

Nothing enabled here leaves the free tier. Workers Free covers 100,000
requests/day; static assets are free and unmetered; observability is on. The
Cloudflare Images binding was deliberately removed. No database, no second
host, no paid add-on was introduced. The Vercel bill is a separate matter and
was not touched.
