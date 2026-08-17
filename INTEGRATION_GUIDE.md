# Huraay production integration guide

Huraay is connected to Supabase project `sgaxuauyztynpuchzzxh`. The database migrations and eight Edge Functions are deployed. The database contains no seed or demo data.

## Browser environment (`.env`)

These variables are loaded by Vite from the root `.env`. Every `VITE_` value is visible in the browser, so never put private keys here.

| Variable | Required value | Status |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://sgaxuauyztynpuchzzxh.supabase.co` | Configured |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key | Configured |
| `VITE_AI_ENDPOINT` | `https://sgaxuauyztynpuchzzxh.supabase.co/functions/v1/write-wish` | Configured |
| `VITE_APP_URL` | Final deployed website origin, for example `https://huraay.com` | Replace localhost before launch |
| `VITE_BUSINESS_BANK_NAME` | Huraay's bank name | Required for manual Pro transfer |
| `VITE_BUSINESS_ACCOUNT_NUMBER` | Huraay's business account number | Required for manual Pro transfer |
| `VITE_BUSINESS_ACCOUNT_NAME` | Huraay's business account name | Required for manual Pro transfer |

Restart `npm run dev` after changing `.env`. The real `.env` is ignored and must not be committed.

## Supabase Edge Function secrets

Set private server values with the Supabase CLI; do not add them to a `VITE_` variable:

```powershell
npx supabase secrets set --project-ref sgaxuauyztynpuchzzxh APP_ORIGIN=https://huraay.com OPENAI_API_KEY=YOUR_REAL_KEY OPENAI_MODEL=gpt-5-mini PAYSTACK_SECRET_KEY=YOUR_REAL_SECRET
```

| Secret | Purpose | Current state |
| --- | --- | --- |
| `APP_ORIGIN` | Allowed browser origin and Paystack callback base | Localhost; replace after frontend deployment |
| `RATE_LIMIT_SALT` | Protects anonymous network hashes | Configured with a generated secret |
| `OPENAI_MODEL` | AI wish-writing model | Configured |
| `OPENAI_API_KEY` | OpenAI server authentication | Not supplied |
| `PAYSTACK_SECRET_KEY` | Paystack initialization and webhook verification | Not supplied |
| `SUPABASE_URL` | Supabase runtime | Managed automatically |
| `SUPABASE_ANON_KEY` | Supabase runtime | Managed automatically |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server data access | Managed automatically; never expose |

The payment and AI functions return a safe configuration error until their vendor secrets exist.

## Live Edge Function endpoints

Base URL: `https://sgaxuauyztynpuchzzxh.supabase.co/functions/v1`

| Function | Endpoint | Authentication |
| --- | --- | --- |
| Public Birthday Page | `/public-page?slug={slug}` | Public |
| Submit Birthday Wish | `/submit-birthday-wish` | Public, server validated and rate limited |
| Protected Wishlist | `/protected-wishlist?page_id={uuid}` | Page-specific visitor token |
| AI Wish Writer | `/write-wish` | Supabase JWT |
| Initialize Paystack | `/paystack-initialize` | Supabase JWT |
| Paystack Webhook | `/paystack-webhook` | Paystack HMAC signature |
| Submit Manual Payment | `/submit-manual-payment` | Supabase JWT |
| Review Manual Payment | `/review-manual-payment` | Supabase JWT plus admin role |
| Admin Payment Queue | `/admin-payments` | Supabase JWT plus admin role |
| Record Page Event | `/record-page-event` | Public share or page-specific wishlist token |

## Paystack launch setup

1. Add `PAYSTACK_SECRET_KEY` as an Edge Function secret.
2. Set the Paystack webhook URL to `https://sgaxuauyztynpuchzzxh.supabase.co/functions/v1/paystack-webhook`.
3. Replace `APP_ORIGIN` with the deployed frontend origin.
4. Run one Paystack test transaction, then one live low-risk transaction.
5. Confirm duplicate webhook delivery does not duplicate Pro activation.

The browser never receives the Paystack secret. Pro activation happens only after a signed, amount-matched NGN success webhook.

## Google OAuth and Auth URLs

In Supabase Dashboard, configure the final Site URL and allow-list:

- `https://YOUR_DOMAIN/auth`
- `https://YOUR_DOMAIN/app/boards/new`
- Any controlled preview domain used for testing

Email confirmation is currently disabled for immediate signup. Before public launch, decide whether to enable confirmation and configure custom SMTP first.

## Admin access

No administrator is seeded. Promote a real authenticated Huraay user deliberately from the Supabase SQL editor:

```sql
insert into public.user_roles (user_id, role)
values ('REAL_AUTH_USER_UUID', 'admin')
on conflict do nothing;
```

Do not create a shared admin account and do not put an admin UUID into a migration.

## Deployment

Both `vercel.json` and `netlify.toml` are included with SPA routing, immutable asset caching, service-worker revalidation, CSP without `unsafe-eval`, and baseline security headers.

Before deploying, set the same browser environment variables in the chosen host and replace `VITE_APP_URL`/`APP_ORIGIN` with the final HTTPS origin.

## Verification commands

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
npx supabase db lint --linked --level warning
npx supabase db advisors --linked --type all --level warn --fail-on none
```

Supabase's leaked-password advisory can only be cleared on a Supabase Pro plan or above. Enable it under Auth settings after upgrading the Supabase project.
