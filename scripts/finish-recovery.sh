#!/usr/bin/env bash
#
# Finishes the Vercel -> Cloudflare Workers recovery.
#
# Everything else is already done: the Worker exists, it is deployed, the admin
# secrets are set, and chaledata.com + www already point at it. The only thing
# missing is the four credentials that Vercel would not give back, without
# which the home page, /detail/[code] and the sitemap return 500.
#
# Fill in .secrets-to-fill.env, run this, and it will check the credentials
# read-only against Supabase, upload them, rebuild, redeploy and verify.
#
# The domain is already live, so a bad deploy would be visible. If anything
# looks wrong afterwards:  npx wrangler rollback --name aron-vtu

set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".secrets-to-fill.env"
WORKER="aron-vtu"
ZONE_ID="95d9565999c02dead19ce10d285f746d"
APEX="chaledata.com"
WWW="www.chaledata.com"
PREVIEW="https://aron-vtu.nanagyams99.workers.dev"

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || fail "$ENV_FILE not found. It holds the credentials this script uploads."

# shellcheck disable=SC1090
set -a; . "./$ENV_FILE"; set +a

for v in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY PAYSTACK_SECRET_KEY \
         NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID; do
  [ -n "${!v:-}" ] || fail "$v is still empty in $ENV_FILE"
done

case "$SUPABASE_URL" in
  https://*.supabase.co) ;;
  *) fail "SUPABASE_URL should look like https://<project>.supabase.co" ;;
esac

export NEXT_PUBLIC_SITE_URL="https://$APEX"
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID

# ── 1. Does the service role key actually work? ──────────────────────────────
say "Checking the Supabase credentials against the live database"
supabase_body=$(
  curl -sS -m 25 \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    "$SUPABASE_URL/rest/v1/networks?select=code&is_active=eq.true" 2>&1 || true
)
networks_count=$(
  printf '%s' "$supabase_body" | python3 -c 'import sys,json
try:
    d=json.load(sys.stdin)
except Exception:
    print("-1"); raise SystemExit
print(len(d) if isinstance(d,list) else "-1")' 2>/dev/null || echo -1
)
if [ "$networks_count" = "-1" ]; then
  echo "    Supabase said: $(printf '%s' "$supabase_body" | head -c 200)"
  fail "Could not read the database with those credentials. Nothing was changed."
fi
echo "    Supabase answered: $networks_count active networks. Nothing was written."

# ── 2. Runtime secrets onto the Worker ───────────────────────────────────────
say "Uploading the runtime secrets to the Worker"
for name in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY PAYSTACK_SECRET_KEY; do
  printf '%s' "${!name}" | npx wrangler secret put "$name" --name "$WORKER" >/dev/null
  echo "    set $name"
done

# ── 3. Rebuild with the real build-time values and deploy ────────────────────
# NEXT_PUBLIC_* are inlined into the client bundle, and the home page,
# /detail/[code] and the sitemap are prerendered from Supabase, so the build
# needs the database too.
say "Rebuilding with the real values and deploying"
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy

# ── 4. Verify the preview URL before going anywhere near DNS ─────────────────
say "Verifying the new deployment on $PREVIEW"
home_status=$(curl -sS -m 40 -o /tmp/aron-home.$$ -w '%{http_code}' "$PREVIEW/")
[ "$home_status" = "200" ] || { rm -f /tmp/aron-home.$$; fail "home page returned $home_status, not 200. DNS left untouched."; }

if ! grep -qiE 'GH|data|bundle' /tmp/aron-home.$$; then
  rm -f /tmp/aron-home.$$
  fail "home page returned 200 but looks empty. DNS left untouched."
fi
rm -f /tmp/aron-home.$$
echo "    home page renders"

for path in /cresco /order /robots.txt /sitemap.xml; do
  s=$(curl -sS -m 30 -o /dev/null -w '%{http_code}' "$PREVIEW$path")
  [ "$s" = "200" ] || fail "$path returned $s. DNS left untouched."
  echo "    $path ok"
done

s=$(curl -sS -m 30 -o /dev/null -w '%{http_code}' "$PREVIEW/api/admin/orders")
[ "$s" = "401" ] || fail "/api/admin/orders returned $s, expected 401. DNS left untouched."
echo "    admin API still refuses anonymous callers"

# ── 5. Make sure the domain is still attached (already done; idempotent) ─────
say "Confirming $APEX and $WWW are attached to the Worker"
for host in "$APEX" "$WWW"; do
  resp=$(curl -sS -m 30 -X PUT \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/domains" \
    --data "{\"zone_id\":\"$ZONE_ID\",\"hostname\":\"$host\",\"service\":\"$WORKER\",\"environment\":\"production\"}")
  ok=$(printf '%s' "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("success"))' 2>/dev/null || echo False)
  if [ "$ok" = "True" ]; then echo "    attached $host"
  else echo "    could not attach $host:"; printf '%s\n' "$resp" | head -c 400; echo; fi
done

# ── 6. Verify the real public site ───────────────────────────────────────────
say "Waiting for DNS and the certificate, then checking the public site"
for attempt in $(seq 1 30); do
  code=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' "https://$APEX/" 2>/dev/null || echo 000)
  [ "$code" = "200" ] && break
  printf '    attempt %s/30: %s\n' "$attempt" "$code"
  sleep 20
done

echo
if [ "${code:-000}" = "200" ]; then
  printf '\033[32mhttps://%s is serving the restored application over HTTPS.\033[0m\n' "$APEX"
  rm -f "$ENV_FILE"
  echo "Deleted $ENV_FILE."
else
  printf '\033[33mThe Worker is deployed and verified, but https://%s still returns %s.\033[0m\n' "$APEX" "${code:-000}"
  echo "DNS and the edge certificate can take a few minutes. Re-check with:"
  echo "    curl -I https://$APEX/"
fi
