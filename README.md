# ChaleData

Data bundles and streaming subscriptions for Ghana, paid for with mobile money
through Paystack and fulfilled through a vendor API.

Next.js 16 (App Router) · React 19 · Tailwind 4 · Supabase · Paystack.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

Open http://localhost:3000. The admin is at `/admin`.

Every variable in `.env.example` is required except the vendor fallbacks — a
missing one fails at startup naming the variable, rather than deep inside a
Supabase call.

## How it fits together

```
Visitor → /                        server-rendered shop (networks + plans)
        → /detail/[code]           plan picker, then Paystack
        → POST /api/checkout       creates a pending order at the DB's price
Paystack → POST /api/webhook       verifies signature AND amount, then fulfils
        → lib/vendor.fulfillOrder  buys from the vendor, or flags for a human
Owner   → /admin                   behind a server-side session (src/proxy.ts)
```

**The browser never talks to Supabase.** Every read and write goes through a
route handler using the service role key, so row level security can keep the
public anon key shut out entirely.

### Where things live

| Path | What it does |
|---|---|
| `src/proxy.ts` | Blocks `/admin` and `/api/admin/*` before the route runs |
| `src/lib/admin-auth.ts` | Signs and verifies the admin session cookie |
| `src/lib/require-admin.ts` | Re-checks the session inside each admin route |
| `src/lib/vendor.ts` | Vendor settings, purchasing, fulfilment rules |
| `src/lib/shop.ts` | Server-side shop reads (never selects `cost_price`) |
| `src/lib/phone.ts` | The one phone format: `233XXXXXXXXX` |
| `src/lib/safe-url.ts` | Stops outbound calls to private/internal addresses |

## Database

Run these in the Supabase SQL editor, in order:

1. `supabase-schema.sql` — tables (fresh install only)
2. `supabase-schema-v2.sql` — streaming support
3. `supabase-fix-orders.sql` — later columns on `orders`
4. **`supabase-security.sql` — required.** Closes the row level security holes,
   adds the atomic customer-totals function, and adds the indexes the payment
   path needs.

Until step 4 is run, the public anon key can still read every order, every
customer phone number, and the stored vendor API key.

## Admin

Sign in at `/admin/login` with `ADMIN_PASSWORD`. The session is an httpOnly,
signed, 8-hour cookie; the password is only ever checked on the server.

- **Networks / Bundles** — what is on sale, and at what price
- **Vendors** — which supplier is used, and the switch for automatic buying
- **Orders** — retry a failed fulfilment, or mark one paid or delivered by hand
- **Customers** — totals per phone number, CSV export

Turning automatic buying off does not lose orders: paid orders queue as
`manual_required` with the number and bundle to buy.

### Bundle sizes

The vendor is asked for a whole number of GB, taken from the bundle's **Vendor
Plan ID** if set, otherwise from its size. A size that is not a whole number of
GB (`500MB`, `1.5GB`) is refused and the order waits for a human rather than
being guessed at — set a Vendor Plan ID on those bundles.

## Deploying

Set every variable from `.env.example` in the host, then point the Paystack
webhook at `https://<your-domain>/api/webhook`.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is no longer used and can be deleted.
