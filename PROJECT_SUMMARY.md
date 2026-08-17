# Huraay project summary

This file contains the concise handoff history so progress does not need to be recovered from chat. Future implementation summaries should be appended here.

## 17 August 2026

### Product implementation

- Built the responsive Huraay marketing site, authentication experience, public Wish Board, wish composer, celebrant workspace, board creator, moderation surfaces, wishlist, notifications, and profile settings.
- Added celebration-focused motion, page transitions, confetti bursts, floating particles, animated wish arrivals, success states, and reduced-motion support.
- Locked the visual system to Huraay purple `#6223CF`, Huraay pink `#EE3A84`, and white.
- Added route-level code splitting and protected application routes.

### Backend implementation

- Added Supabase schemas for profiles, boards, wishes, wishlist items, collaborators, reactions, contributions, reports, and notifications.
- Added indexes, validation constraints, Row Level Security policies, private wish-media storage, account provisioning, and Realtime publications.
- Added the authenticated `write-wish` Supabase Edge Function for AI-assisted message writing.
- Added `.env.example`, `supabase/config.toml`, and `INTEGRATION_GUIDE.md` for production setup.

### Brand assets

- The site now uses `Huraay Full Logo.png` as the product logo.
- The site now uses `Huraay Favicon.png` as the browser favicon.
- The supplied assets are used directly and were not recreated.

### Fresh-data requirement

- Removed the demo data module and every API fallback that returned sample records.
- Removed prefilled dashboard boards, wishes, wishlist items, notifications, profile details, and board-editor values.
- Dashboard totals begin at zero and product lists use intentional empty states.
- Marketing illustrations are generic interface demonstrations and are not stored product data.
- No database seed script or seed records are included.

### Verification

- TypeScript and the production Vite build pass.
- npm dependency audit reports zero known vulnerabilities.

### Product clarification and future PRD workflow

- The board title is the name of the celebration page, such as `Tola's 30th Birthday` or `Our Graduation Celebration`.
- The celebrant name is the name of the person receiving the wishes, such as `Tola`.
- The current board creator does not yet include the required profile-picture and cover-image upload controls. These should be added when implementation resumes.
- The existing Huraay product, branding, layouts, and completed functionality must be preserved when a new PRD is supplied.
- The next PRD should be compared against the existing implementation. Only missing requirements and explicitly requested changes should be added.

## Birthday SaaS PRD Implementation — August 17, 2026

### Product direction

- Refocused Huraay around the birthday-specific promise: one link for birthday wishes, wishlist, and gifts.
- Preserved the supplied Huraay wordmark and favicon and retained purple/pink/white as the brand system.
- Reworked the public experience as a personal Birthday Page rather than a dashboard or generic SaaS template.
- Kept all product data fresh. No owner, page, wish, wishlist, payment, theme, or analytics seed records were added.

### Frontend delivered

- Added an original responsive marketing page, Free versus lifetime Pro pricing, authentication, owner workspace, progressive six-step Birthday Page creator, public Birthday Page, Wish Wall, wish composer, protected wishlist, upgrade page, and internal admin surface.
- Connected Birthday Page publishing to authenticated Supabase writes and private media uploads. Owners now see their real Birthday Pages in the workspace.
- Added client-side image compression to WebP, metadata-removing canvas processing, previews, deletion, cover ordering, and mobile gallery/camera-compatible file selection.
- Added public/private wish explanations, 500-character control, selected celebrant photo, preserved local drafts after network failure, duplicate-submit prevention, actionable errors, loading skeletons, and intentional empty states.
- Added custom lightweight celebration motion, wish success motion, wishlist reveal motion, countdown states, reduced-motion support, mobile-first layouts down to 320px, and dark browser theme metadata.
- Added Paystack checkout initiation and a working manual-payment proof form that uploads a private receipt and creates a review submission.
- Added an installable PWA manifest, service worker, safe runtime caching rules, route code splitting, secure headers, CSP, noindex behavior for personal Birthday Pages, and the supplied application icons.

### Supabase and database delivered

- Added reproducible migrations for profiles, entitlements, Birthday Pages, photos, saved bank accounts, wishlist items, wishes, page-specific visitor access, events, Paystack/manual payments, user roles, admin audit logs, themes, and rate-limit records.
- Added UUID keys, foreign keys, constraints, lifecycle timestamps, query indexes, Free/Pro database limit triggers, owner-only RLS, administrator policies, and private Storage policies.
- Birthday, wishlist, and receipt media buckets are private. Visitor-facing media is delivered with short-lived signed URLs.
- Anonymous users do not receive direct reads on sensitive base tables. The safe public page endpoint omits WhatsApp, bank, private-wish, wishlist, payment, and owner-private data.
- Wishlist access is enforced server-side: a valid wish creates a cryptographically random page-specific token, only its SHA-256 hash is stored, and protected reads validate the page, hash, expiry, and published state.
- Added wish validation, honeypot protection, minimum completion time, selected-photo ownership validation, per-page network-hash rate limiting, plain-text rendering, and strict message/name limits.
- Added fixed-price server-side Paystack initialization, HMAC webhook verification, amount matching, idempotent activation, and server-only secrets.
- Added manual payment submission and administrator review functions. Receipt submission never activates Pro; approval requires an admin role, is idempotent, and writes an audit record.

### Configuration to replace

- Browser variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_APP_URL`, and optional `VITE_AI_ENDPOINT`.
- Edge Function secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `RATE_LIMIT_SALT`, `APP_ORIGIN`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and the `BUSINESS_BANK_*` values.
- Configure Google OAuth in Supabase Auth and Paystack's webhook URL after deployment.
- Full setup instructions remain in `INTEGRATION_GUIDE.md`; examples are in `.env.example` and `supabase/.env.example`.

### Verification completed

- TypeScript strict check passes.
- Automated tests pass: 2 files and 9 tests, including visitor-token hashing/scope, unpublished-page denial, Paystack idempotence, private storage, phone normalization, and WhatsApp message encoding.
- Production PWA build passes and generates the service worker and manifest.
- npm audit reports zero known vulnerabilities.

### Deployment boundary

- The application and migration/function sources are ready for environment connection, but live Supabase, Google OAuth, Paystack, email delivery, and hosting behavior cannot be verified until real project credentials and deployment targets are configured.
- Before accepting production traffic, apply all migrations, deploy the Edge Functions, configure secrets and provider callbacks, then run browser-based end-to-end tests against the live staging environment.

## Landing Page Visual Redesign — August 17, 2026

- Rebuilt the hero around a more distinctive asymmetric product demonstration instead of a basic two-column card.
- Added a sculptural purple stage, layered birthday-page preview, orbit lines, wish arrival card, gift card, and animated wishlist-unlocked state.
- Updated the primary headline to communicate why Huraay is better than temporary social statuses.
- Introduced a light-purple feature environment and a richer purple/pink memory section to improve brand rhythm while keeping neutral space dominant.
- Replaced the conventional three-column footer with an abstract deep-purple Huraay composition featuring oversized H forms, a pink focal accent, stronger closing copy, and a final conversion action.
- Added dedicated tablet and mobile layouts for the new hero and footer, including controlled overflow and touch-friendly actions.
- Preserved reduced-motion behavior and existing Huraay brand assets.
- TypeScript validation and the production PWA build both pass after the redesign.

### Reversion

- The landing-page visual redesign described immediately above was rejected and has been reverted.
- Restored the previous hero copy and product preview, the previous neutral section treatments, and the original compact footer.
- No backend, database, authentication, payment, PWA, or product-flow implementation was changed during the reversion.
- TypeScript validation passes after restoring the previous landing page.

## Hero Alignment Update — August 17, 2026

- Removed the “Your birthday, all in one link” label from the landing-page hero.
- Centered the hero headline, supporting text, and CTA group within the hero content area.
- TypeScript validation passes after the update.

### Alignment correction and logo sizing

- Restored the hero content to its original left alignment.
- Moved the hero copy upward to occupy the space left by the removed label.
- Increased the landing-page navigation logo from 36px to 48px high.

## Sticky Navigation and Responsive Tightening — August 17, 2026

- Made the landing-page navigation sticky so it remains visible while scrolling.
- Added a translucent neutral navigation surface, border, blur, and elevated stacking order for readable content underneath.
- Prevented accidental document-level horizontal scrolling and constrained media to the viewport.
- Added `min-width: 0` containment to major grid and application layout children.
- Tightened landing-page widths, typography, cards, hero preview, floating hero elements, and CTA wrapping across 320px to 800px layouts.
- Converted the smallest navigation CTA to a compact icon action so it does not force horizontal overflow.
- Kept intentional horizontal interactions, such as the public photo gallery, independently scrollable.
- TypeScript validation passes after the responsive update.

### Mobile navigation correction

- Replaced the compressed purple header action with a clearly labelled Menu button and hamburger icon.
- Added a functional mobile navigation panel containing How it works, Features, Sign in, and Create a Birthday Page.
- Added open/close accessibility labels, expanded state, close icon, outside-click scrim, and automatic closing after navigation.

## FAQ Interaction Polish — August 17, 2026

- Replaced the abrupt native FAQ disclosure with a controlled single-open accordion.
- Added a smooth height and opacity reveal using Huraay's motion easing.
- Added a rotating plus control, soft-purple active surface, gentler answer typography, keyboard focus treatment, and reduced-motion support.

## Supabase Credentials Required

- Frontend-safe values: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Server-only Edge Function value: `SUPABASE_SERVICE_ROLE_KEY` or the current Supabase server secret key. This must never use a `VITE_` prefix or enter browser code.
- Supabase automatically provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions; they generally do not need to be manually added after deployment.
- Google OAuth also requires Google Client ID and Client Secret configured directly in Supabase Authentication provider settings.
- Secrets should be placed in `.env.local`, Supabase Edge Function Secrets, or the hosting provider's encrypted environment settings, not committed to Git.

### Local environment file

- Created the root `.env` file with placeholders for the Supabase project URL, publishable key, AI Edge Function URL, and local application URL.
- Added `.gitignore` rules for root and Supabase environment files, build output, dependencies, and logs so credentials are not committed accidentally.

### AI endpoint and application URL

- `VITE_AI_ENDPOINT` is the deployed Supabase `write-wish` Edge Function URL: `https://PROJECT_REF.supabase.co/functions/v1/write-wish`.
- The project reference is the subdomain portion of `VITE_SUPABASE_URL` and is also visible in Supabase Project Settings.
- For local development, `VITE_APP_URL` is `http://localhost:5173` unless the Vite development server reports a different port.
- For production, `VITE_APP_URL` must be the public hosting domain, such as `https://huraay.com` or the assigned Vercel/Netlify domain.
- The AI URL works only after `write-wish` is deployed and its server-side OpenAI secrets are configured.

## OpenAI API Key Setup

- OpenAI API access is billed separately from ChatGPT subscriptions.
- Create an OpenAI Platform project for Huraay, configure API billing and spending controls, then create a project API key from the OpenAI Platform API Keys page.
- Store the key only as the Supabase Edge Function secret `OPENAI_API_KEY`; never put it in `.env` under a `VITE_` name or expose it to the browser.
- Configure `OPENAI_MODEL` as a separate Edge Function secret. The current Huraay function defaults to `gpt-5-mini` when this value is absent.
- Deploy `supabase/functions/write-wish` after setting secrets. Its endpoint is then used as `VITE_AI_ENDPOINT`.

## Huraay Form Component System — August 17, 2026

- Added a reusable custom `Select` component with branded trigger, animated option panel, selected state, descriptions, keyboard navigation, Escape handling, and outside-click dismissal.
- Added a reusable custom `DatePicker` with month navigation, Nigerian date formatting, Monday-first calendar grid, today/selected states, clear action, keyboard-readable labels, and outside-click dismissal.
- Replaced native browser date inputs in Birthday Page creation and manual transfer submission with the Huraay date picker.
- Added mobile bottom-sheet calendar behavior for narrow screens and consistent purple focus rings, 12px radii, shadows, spacing, and motion tokens.
- The hero was intentionally left unchanged during this component-system phase.

## Content Security Policy Evaluation Warning

- Audited Huraay source files and the generated production bundle for `eval`, `new Function`, and related dynamic code execution patterns.
- The production bundle contains no string-evaluation code and the production CSP correctly excludes `unsafe-eval`.
- Vite's development-only client contains a legacy `Function("return this")` fallback, but this code is not included in the production bundle and modern browsers use `globalThis` before that fallback.
- If the console source is `@vite/client`, the warning is development-tooling-only. If it begins with `chrome-extension://` or `moz-extension://`, it comes from an installed browser extension.
- The CSP was intentionally not weakened with `unsafe-eval` because doing so would reduce XSS protection without fixing Huraay's production code.

## Purple How-It-Works Section — August 17, 2026

- Converted the “One link for the people who matter” section into a contained Huraay-purple brand surface.
- Added white headings, softened white body copy, pink labels and step numbers, a restrained purple shadow, and responsive mobile padding.
- Updated the section to a true full-width purple band, removed the shadow and rounded outer container, and retained content alignment with the main page grid.

## Flat Landing-Page Cards — August 17, 2026

- Removed the shadow behind the “A private wish” card.
- Removed shadows from the hero product preview, floating wish card, floating wishlist card, and floating memory cards.
- Retained borders and contrasting surfaces so card boundaries remain clear without elevation effects.

### Memory card spacing

- Moved the “memories kept forever” card upward and closer to the other two memory cards.
- Added tablet and small-mobile position adjustments to preserve the tighter composition responsively.

## Sleek Footer Redesign — August 17, 2026

- Replaced the compact three-column footer with a full-width, deep-purple editorial footer.
- Added a restrained white logo lockup, strong closing statement, concise product message, grouped navigation, and compact legal row.
- Avoided shadows, abstract oversized marks, gradients, and decorative clutter.
- Added responsive two-column, single-column, and compact mobile layouts.

## Root Environment Configuration — August 17, 2026

- Confirmed the project has a root `.env` file and no `.env.local` file.
- Renamed the supplied Next.js-style Supabase variables to Vite-compatible `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` names without exposing their values.
- Confirmed frontend API calls use `import.meta.env` and the Vite-prefixed variables from the root `.env` file.
- Updated runtime errors and integration documentation to reference `.env` instead of `.env.local`.
- Supabase Edge Functions continue to use secure server-side `Deno.env` secrets; those are not browser variables and must remain configured in Supabase.

### Footer brand color correction

- Updated the sleek footer background from the temporary dark-purple value to the exact Huraay brand purple `#6223CF`.

## Supabase Email Confirmation Diagnosis

- Supabase Email Auth currently has Confirm Email enabled, so signup creates the user without an active session until the confirmation link is used.
- For immediate development access, Confirm Email can be disabled under Supabase Dashboard → Authentication → Providers → Email.
- For production, keeping confirmation enabled is safer, but the Site URL, redirect URLs, confirmation template, and custom SMTP delivery must be configured.
- Existing unconfirmed test accounts either need to use the confirmation email, be confirmed from the Supabase user administration screen, or be deleted and recreated after confirmation is disabled.

### Remote configuration access result

- Attempted to link the CLI to the Supabase project configured in Huraay's `.env`: `sgaxuauyztynpuchzzxh`.
- The authenticated Supabase CLI account can currently see only the separate `erna-web` project and does not have the required management privilege for the Huraay project.
- Supabase rejected the project link with `LegacyLinkProjectStatusError` and a permissions message, so the hosted Confirm Email setting could not be changed safely from this workspace.
- The Huraay project must be added to the currently authenticated Supabase account/organization, or the CLI must be logged into an account that owns that project, before remote Auth configuration can be changed.

### Live email-confirmation verification

- Queried the public Auth settings endpoint for the exact Supabase project configured in Huraay's `.env`.
- Verified `mailer_autoconfirm: true`, which means Confirm Email is now disabled correctly for new signups.
- The remaining confirmation message is therefore tied to an account created before the setting was disabled; changing the setting does not retroactively confirm that existing user.
- Resolve the existing user by confirming it in Supabase Authentication → Users, deleting and recreating it, or using its original confirmation email.

## Missing Birthday Schema Diagnosis

- The `public.birthday_pages` schema-cache error confirms that Huraay is reaching Supabase successfully but the repository migrations have not been deployed to the configured project.
- Four ordered migrations are ready under `supabase/migrations`, including the Birthday Page tables, RLS, storage policies, functions, indexes, and security hardening.
- The current CLI profile still has access only to `erna-web`, not Huraay project `sgaxuauyztynpuchzzxh`; the in-app browser connection was also unavailable.
- A one-time Supabase CLI login using an account with Huraay project access is required before `supabase link`, dry-run, migration push, and schema verification can be completed.

### Supabase account switch

- Successfully logged the CLI out of the previous Supabase account.
- The normal login command could not run in the non-interactive agent terminal, so a separate visible interactive PowerShell login window was opened for the user.
- Authentication is still pending; the CLI currently reports that no access token is present.
- After the user completes the browser authorization in the visible window, project access must be verified before migrations are applied.
- The first visible login inherited JSON agent mode and could not prompt. A corrected login window was launched with `--agent no --output-format text` so interactive browser authorization can proceed.

## Production Supabase Deployment — August 17, 2026

- Logged into the Supabase account that owns Huraay and linked project `sgaxuauyztynpuchzzxh`.
- Applied all six repository migrations in order. The missing `public.birthday_pages` schema-cache error is resolved.
- Added automatic profile and Free-entitlement provisioning for every new Auth user and backfilled only real existing Auth users. No sample, demo, or seed content was inserted.
- Consolidated overlapping RLS policies for board membership, manual payments, wishlists, and admin audit access.
- Made `birthday-media` and `wishlist-media` private. Public Birthday Pages and unlocked wishlists now receive short-lived signed image URLs from trusted functions.
- Preserved owner-only access to drafts, private wishes, bank accounts, payments, receipts, and administrator data.
- Confirmed all local and remote migrations match.
- Supabase database lint result: no schema errors.
- Supabase database advisor result: all database policy warnings cleared. The only remaining advisory is Supabase Auth leaked-password protection, which Supabase provides on paid Pro plans and above.

### Deployed Edge Functions

- `public-page`
- `submit-birthday-wish`
- `protected-wishlist`
- `write-wish`
- `paystack-initialize`
- `paystack-webhook`
- `submit-manual-payment`
- `review-manual-payment`

All eight functions are active in the Huraay project.

### Backend hardening completed

- Wish submission validates the page, photo ownership, input lengths, visibility, honeypot, minimum completion time, five-attempt/ten-minute limit, and twenty-attempt/day network limit.
- Wishlist unlock tokens are random, page-specific, time-limited, and stored only as SHA-256 hashes.
- Invalid or expired tokens cannot retrieve wishlist, bank, or WhatsApp data.
- Paystack initialization now fails safely when its secret is absent and marks failed provider initialization attempts.
- Paystack webhook handling checks the HMAC signature, NGN currency, successful provider state, exact database amount/reference, and an idempotent pending-to-success transition.
- Manual-payment submission now validates authenticated receipt ownership, file path, storage existence, field lengths, and input shape before creating a review submission.
- Generated and configured a private rate-limit salt in Supabase.

### Live verification

- Invalid public slug returns `400`.
- Missing published page returns `404`.
- Wishlist request without visitor token returns `401`.
- Invalid wish request is rejected before insertion.
- Anonymous REST schema probe for `birthday_pages` returns a valid empty result rather than a schema-cache error.
- The production database remains fresh and empty.

## Production Build and Hosting Readiness — August 17, 2026

- Corrected `VITE_AI_ENDPOINT` to the live Huraay Edge Function URL.
- Removed the hidden UTF-8 BOM from `.env` so Supabase CLI and Vite load the same root environment file reliably.
- Confirmed `.env` is excluded by `.gitignore`; no secret values were added to source files.
- Added Vercel and Netlify deployment configurations with SPA rewrites, immutable asset caching, safe service-worker caching, CSP without `unsafe-eval`, clickjacking protection, MIME sniffing protection, referrer policy, and permissions policy.
- Fixed manual-payment field-name mismatches between the frontend, Edge Function, and database.
- Added explicit business-bank environment variables and a safe unavailable state when manual transfer is not configured.
- Added and configured ESLint, then resolved React purity and state-effect findings in celebration motion, Auth initialization, and wish timing.
- Production checks passed: ESLint, TypeScript, 9 automated tests, Vite/PWA build, and npm audit.
- Dependency audit result: zero known vulnerabilities.

### External launch values still required

- `OPENAI_API_KEY` must be added as a Supabase Edge Function secret before AI writing can generate real suggestions.
- `PAYSTACK_SECRET_KEY` must be added as a Supabase Edge Function secret before Paystack checkout can process real payments.
- `VITE_APP_URL` and Supabase `APP_ORIGIN` must be changed from localhost to the final HTTPS domain after hosting is selected.
- `VITE_BUSINESS_BANK_NAME`, `VITE_BUSINESS_ACCOUNT_NUMBER`, and `VITE_BUSINESS_ACCOUNT_NAME` must be supplied before manual Pro transfers are offered.
- A real authenticated user must be deliberately assigned the `admin` role; no administrator was seeded.
- The complete current setup and endpoint list is documented in `INTEGRATION_GUIDE.md`.

## Functional Product Completion Pass — August 17, 2026

- Replaced the existing-page edit route's empty creation form with live loading and update behavior for the owner's real Birthday Page.
- Existing photos are preserved during general edits; details, date, headline, introduction, WhatsApp number, design, and wishlist changes now save to Supabase.
- Added purchase-link entry to the wishlist creation flow.
- Made Pro photo limits available to Pro owners and routed Free users who select premium themes to the upgrade experience.
- Enforced Free/Pro design entitlements in Postgres so premium themes, custom colors, and vanity slugs cannot be unlocked by changing browser state.
- Tightened the Free plan to one Birthday Page per account, including archived pages.
- Added cross-owner protection for Birthday Page photo paths, wishlist image paths, and attached bank accounts.
- Added owner-authorized wish deletion at both RLS and grant levels.

### Live owner workspace

- Replaced placeholder dashboard totals with real page, wish, private-wish, and moderation counts.
- Connected Your Wishes to real public/private/pending/hidden data.
- Added working publish, hide, restore, and permanent-delete moderation actions.
- Connected Wishlist management to real items with fulfilled, hidden, restored, and delete actions.
- Connected profile name and default WhatsApp settings to the real profile table.
- Added a working sign-out control and correct Free/Pro page-creation behavior.
- Replaced the empty notification view with recent real wish activity.

### Admin and analytics

- Added and deployed `admin-payments`, which checks the administrator role server-side, retrieves the manual payment queue with service-role isolation, and returns short-lived private receipt URLs.
- Replaced the static admin payment screen with live search, status totals, receipt review, approval, rejection, and request-new-receipt actions.
- Existing `review-manual-payment` continues to activate Pro idempotently and writes an audit record for every decision.
- Added and deployed `record-page-event` for gift clicks, bank copies, WhatsApp intent, and sharing.
- Protected gift interaction events require a valid page-specific wishlist token.
- Public Page loads now record privacy-preserving page views using a salted network hash.
- Added a Pro analytics view with total views, unique visitors, wishlist unlocks, purchase clicks, bank copies, WhatsApp intents, and a simple funnel.

### Final verification after functional completion

- Supabase schema lint: no errors.
- Supabase database policies/performance: no actionable warnings; only the paid-plan leaked-password Auth advisory remains.
- Live analytics invalid-payload check: `400`.
- Live admin unauthenticated check: `401`.
- Live missing-public-page check: `404`.
- ESLint: passed.
- TypeScript strict build: passed.
- Automated security/unit tests: passed.
- Production PWA build: passed.

## Birthday Page Creation UX Refinement: August 17, 2026

### Photo framing and card preview

- Added a custom photo-framing dialog to every uploaded birthday photo.
- Owners can control zoom, horizontal position, and vertical position before saving the frame.
- The framed 4:5 crop is rendered into the optimized image file, so the chosen composition persists after upload rather than existing only as temporary preview state.
- Added accessible keyboard handling, focus containment, Escape dismissal, backdrop dismissal, and visible focus treatment to the reusable dialog component.
- Dialog and button motion now respects the device's reduced-motion preference.
- Removed unmanaged object URLs from upload and live-preview rendering to prevent browser memory leaks.
- The purple initial placeholder now appears only when no cover image is attached.
- Once a photo exists, the photo fully replaces the initial placeholder.
- Renamed the first details field to `Celebrant name` and made that name a clear, dedicated element in the live Birthday Page card preview.

### Wishlist form rhythm

- Reworked the quick wishlist form into a clearer responsive layout.
- Item name and price use a balanced desktop row.
- Purchase link receives a full-width row with a larger vertical gap from the price field.
- The Add Item action now sits on its own line, and the full form stacks cleanly on narrow mobile screens.

### In-flow Pro upgrade experience

- Premium theme selection no longer redirects the owner to a separate pricing page.
- Selecting a premium theme opens a focused Pro modal inside the creation wizard.
- The modal explains the one-time `₦2,000` upgrade, shows the main benefits, and allows the owner to keep designing without losing their place.
- Paystack can be opened directly from the modal when the owner chooses to upgrade.
- The current Birthday Page draft is force-saved before external checkout begins.

### Unfinished draft continuation

- Added IndexedDB-backed autosave for new Birthday Pages.
- Draft storage preserves text fields, the current creation step, wishlist entries, theme choice, and uploaded photo files on the same device.
- Returning to `Create My Birthday Page` automatically resumes the unfinished page at the saved step.
- A confirmation toast explains that the unfinished Birthday Page has been restored.
- A subtle `Saved on this device` state appears in the desktop editor header.
- The stored draft is removed only after the Birthday Page publishes successfully.
- No demo or seed data was created.

### Verification

- TypeScript strict typecheck: passed.
- ESLint: passed.
- Automated tests: 14 passed, including new photo crop-position and zoom coverage.
- Production Vite and PWA build: passed.
- Local development server returned HTTP `200`.
- The shared visual browser was not connected in this session, so an automated screenshot and click-through could not be completed from that browser surface.

## Birthday Transfer Details and Receipt Upload: August 20, 2026

- Added page-level transfer account fields to the Birthday Page editor so celebrants can save bank name, account number, and account name while creating or editing a page.
- Added a protected public-page transfer card that appears after the wish gate unlocks and lets wishers copy the transfer account and open a receipt upload dialog.
- Added a reusable `ReceiptUploader` component for image and PDF receipts.
- Added a private `birthday-transfer-receipts` Supabase flow:
  - migration for the transfer details columns and transfer receipt table,
  - private storage bucket for uploaded receipts,
  - visitor-token-validated Edge Function for upload,
  - owner dashboard list for submitted transfer receipts with signed receipt links.
- Kept the existing Pro payment receipt flow separate from birthday transfer receipts.
- Verified the implementation with `npm.cmd run typecheck` and `npm.cmd run build`.
