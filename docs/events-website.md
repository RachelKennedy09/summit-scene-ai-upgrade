# Public events website: review and release guide

Nothing in this change deploys the website/backend, submits an app, changes DNS, or runs an import against production.

## Repository audit and approach

- The app is Expo 57 / React Native, using React Navigation. `RootNavigator` already exposes `EventDetail` without an account and retains authenticated business/admin routes. The existing custom scheme is `summitscene://`; verification and password recovery links are retained.
- The website source is `landing/`. Netlify previously published those static HTML/CSS files directly, with clean legal/support URLs in `_redirects` and email/password recovery rewrites in `netlify.toml`.
- Express runs from `server/index.js`, connects to the existing MongoDB through `MONGODB_URI`, and serves `/api/events`. Pending/rejected imports are stored separately in `ImportCandidate`; approved imports become `Event` documents. `Event` has no draft publishing workflow, cancellation history or soft-delete workflow. The existing delete action removes the document.
- Legacy event endpoints populate creator/attendee profiles, including fields beyond what a public website needs. The website uses new GET-only `/api/public/events` endpoints with allowlisted event fields, sanitized links, and only a verified business's public name/website. It receives no attendee records, account IDs/emails, raw imports, source snapshots or review notes. Existing mobile response shapes and write authentication/ownership checks remain unchanged.
- New public reads also exclude explicit draft, private, unlisted, deleted, non-published and unknown-status flags in legacy documents. This does not add a new publishing workflow or migrate existing data.
- Main listings reuse the current app's `buildListingTypeCondition("events")` and category expansion rules. Restaurant specials/happy hours, tours and classes retain their existing separation. Their shared detail URLs remain usable without promotion Event markup.

Rendering choice: retain the static marketing/legal pages and Netlify domain. A small Netlify Function renders `/events`, the three town pages, event details and sitemaps from the shared API. This adds server rendering without a framework migration, client-only event loading, another database or a copied catalog. Netlify Functions must be enabled on the existing site. The website build now publishes `.website-dist`, generated from `landing/` plus domain association files; do not edit that generated folder.

Relevant implementation: `server/services/publicEvents.js`, `server/routes/publicEvents.js`, `website/render.js`, `netlify/functions/events.mjs`, `landing/events-web.css`, `utils/publicEventDates.js`, `utils/publicEventFilters.js`, `utils/eventLinks.js`, `utils/appLinking.js`, and `scripts/buildWebsite.mjs`.

## Local review

From the repository root:

```powershell
npm ci
npm --prefix server ci
npm run test:website
npm run test:event-importer
npm run test:app-updates
npm run test:app-usage
npm run build:website
npm run preview:website -- --fixture
```

Open `http://localhost:4173/events`. Fixture mode visibly labels its sample listings. It is local-only and the deployed function never imports the sample data. To inspect actual backend data instead, run the updated backend against a staging database, set `PUBLIC_API_BASE_URL` to that backend's origin in the preview process, and run `npm run preview:website` without `--fixture`. The preview helper does not load `.env` automatically; set environment variables in the shell.

Tests cover public visibility/field privacy, promotion separation, database pagination, category/town/date filters, recurrence parity, DST transitions, escaped HTML/JSON-LD, missing/removed pages, canonical redirects, sitemap shards, API failures, read-only methods, stable sharing links and association identifiers. Query expressions are exercised with development-only Mingo fixtures. They are not a substitute for a staging MongoDB smoke test and `explain()` on the actual deployment.

## Configuration

| Variable | Where | Value / purpose |
| --- | --- | --- |
| `MONGODB_URI` | Backend only, existing | Keep the existing database connection. Never add it to Netlify or Expo public variables. |
| `PUBLIC_API_BASE_URL` | Netlify Functions; local preview | `https://summit-scene-backend.onrender.com` if that remains the deployed backend. Origin only, without `/api`. Set this explicitly; the deployed renderer does not default to an unconfigured API. |
| `PUBLIC_SITE_URL` | Netlify Build **and** Functions | `https://summitscene.ca`. Controls canonical URLs, sitemap URLs and generated robots.txt. |
| `PUBLIC_GOOGLE_PLAY_URL` | Netlify Functions, optional | Existing repository listing: `https://play.google.com/store/apps/details?id=com.rachellauren.summitscene`. Set only after verifying the intended public release can be installed. Otherwise new pages display only the verified existing iOS download link. Store availability could not be verified from this environment. |
| `EXPO_PUBLIC_WEBSITE_URL` | Expo/EAS builds, optional | `https://summitscene.ca` (the default). Controls mobile shared URLs and accepted HTTPS links. Native domain declarations currently intentionally target `summitscene.ca`; update them together if the domain changes. |
| `APPLE_APP_ID_PREFIX` | Netlify Build, optional | Actual App ID prefix from Apple; takes precedence over `APPLE_TEAM_ID`. Usually the Team ID, but verify for transferred/older apps. |
| `APPLE_TEAM_ID` | Netlify Build | Owner-supplied Team ID `8KSNLDY8AS`, configured in `netlify.toml` under `build.environment` and shown in `.env.example`. Combined with the Bundle ID, it generates `8KSNLDY8AS.com.rachellauren.summitscene`. |
| `ANDROID_SHA256_CERT_FINGERPRINTS` | Netlify Build | The owner-supplied fingerprint is configured in `netlify.toml` under `build.environment` and shown in `.env.example`. Confirm it is from **Play Console → App integrity → App signing key certificate**. Include both applicable fingerprints during signing-key upgrades. Upload/debug certificate fingerprints do not verify a Play-installed release. |

These domain-verification identifiers are public association data. No new admin secrets, credentials or signing keys are embedded in the app or website. With missing verification identifiers, the build writes empty associations instead of invented values; website links still work in a browser, but verified opening in the app remains pending.

Known app identifiers preserved: iOS/Android `com.rachellauren.summitscene`, App Store listing `https://apps.apple.com/app/summit-scene/id6777819596`. No store version/build numbers are changed by this work. The Android fingerprint supplied by the owner is `55:EE:AA:6B:CF:1E:5A:FE:46:2B:68:8A:B0:1C:5D:ED:7E:CD:2B:CA:2E:F9:9C:C4:D3:96:1C:93:78:06:B3:DC`. The owner-supplied Apple Team ID is `8KSNLDY8AS`; its generated association identifier is `8KSNLDY8AS.com.rachellauren.summitscene`. Domain verification still requires deployment and production-signed device testing.

Netlify supplies the configured Team ID and fingerprint to the build automatically. For a direct local `npm run build:website`, set `APPLE_TEAM_ID` and `ANDROID_SHA256_CERT_FINGERPRINTS` in that shell first; npm does not load `netlify.toml` or `.env.example` by itself.

## Deployment order — when approved

1. Deploy the backend through its existing Render workflow. The root-relative imports in `server/` still need the full repository checkout; retain the current deployment layout. Existing start command is `npm --prefix server start` from the root or `npm start` with server as the working directory. Keep existing backend secrets and authorization configuration.
2. Confirm MongoDB supports date aggregation operators (`$dateAdd`, `$dateDiff`: MongoDB 5.0+). Install the new Event indexes through the established migration/index process if automatic Mongoose index creation is disabled: `{ town: 1, date: 1, _id: 1 }`, `{ date: 1, _id: 1 }`, `{ scheduleType: 1, "recurrence.untilDate": 1 }`. These declarations do not require changing event documents. Use staging to check query plans for your catalog size before release.
3. Smoke-test anonymously: `/api/public/events`, `?town=Banff&when=today`, `?category=Music%20%26%20Nightlife&page=1`, `/api/public/events/<real-published-id>`, and `/api/public/events/sitemap?page=1`. Confirm a pending ImportCandidate and any private/draft/deleted test fixture are absent. Use a disposable staging fixture, not production changes. Check `/api/events` still serves the installed app's existing response format.
4. In the existing Netlify project's environment settings, add the variables above in the stated scopes. Keep the existing custom domain and DNS. This repository's `netlify.toml` selects build `npm run build:website`, publish `.website-dist`, functions `netlify/functions`, bundled with esbuild. Do not deploy just the static folder through a hosting workflow that omits Functions.
5. Release a Netlify Deploy Preview first. Verify direct navigation/reload at `/events`, all three town URLs, and a real stable-ID detail URL. Check source HTML contains the listing data without JavaScript, and confirm the real metadata/sitemap outputs. Netlify's deployment-context robot rules must keep previews out of Google. The local preview is explicitly marked as sample content; production contains only API listings.
6. When approved, deploy the website to the existing production domain. No DNS change is needed for event browsing. Data updates appear on normal page loads after short caches expire: API max-age 30 seconds, shared cache 60 seconds; website shared cache 60 seconds (sitemap index 300 seconds). Failures return uncached 503 with retry, never a fabricated empty catalog. There is no polling. Lists contain 24 records per page; event sitemaps contain at most 1,000 records each.
7. Add the real Apple prefix/Team ID and Play certificate fingerprint to Netlify Build configuration, then rebuild so `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` contain the correct identities. Confirm both return HTTP 200 JSON with no redirects on `https://summitscene.ca`.
8. Build new iOS and Android binaries through the existing EAS production profiles when ready. The app config adds iOS associated domains and Android verified HTTPS intent filters, which require a native build. This repository ignores generated `ios/` and `android/`; clean checkout EAS builds generate the native configuration from `app.config.js`. For local native builds, regenerate with Expo's normal prebuild workflow after reviewing any local native customizations; don't discard local changes blindly. No native folders need to be committed.
9. Test cold and warm app links on physical devices with the production-signed app. Sharing produces `/events/<database-id>/<readable-slug>`; detail-ID and old-slug links redirect to the current canonical URL on the website. Town links open the app's matching event browser. Logged-out detail viewing still works; editing, posting and administrative actions retain authentication. Test existing `summitscene://verify-email` and `summitscene://reset-password` flows too.

The website/backend can ship before new mobile builds. Already-installed versions can open the website in a browser; they cannot gain native domain entitlements retroactively. The sharing change and verified-link handling are available in the updated app. Android domain verification depends on Play signing, and iOS association propagation can take time. Store/device/domain checks were not performed by submitting builds or modifying production.

## Search and lifecycle behavior

- Public pages have distinct town/detail headings, accurate titles/descriptions, canonical URLs, Open Graph and Twitter image metadata. Town pages use relevant local descriptions and database listings. Detail URLs retain the database ID when titles/slugs change. Old or absent slugs redirect 301 to the current URL; removed/private/malformed events return 404 rather than a client-side soft error.
- Unknown filters return 400 with a reset link. Filter and pagination query URLs are `noindex,follow` and canonicalize to the unfiltered town/list page; primary pages and event URLs remain linked with ordinary HTML anchors. There is no client JavaScript requirement to browse. Server-rendered navigation uses the browser's normal document loading; API outages have an explicit retry page.
- `robots.txt` advertises `/sitemap.xml`, which links a static-page sitemap and dynamically paged event sitemaps. Auth/recovery HTML has noindex metadata plus Netlify headers, and is absent from sitemaps; crawlers can read those directives. No login/account/admin pages are generated. Never use a blanket SPA rewrite for the events paths.
- Event JSON-LD is emitted only for a genuine single event with a real date, time (or explicit all-day flag), physical venue and address. It matches visible content, uses Mountain DST offsets and never invents price/currency, performers, ticket availability or organizer details. Recurring series, multiple showtimes, offers and incomplete locations intentionally get no Event markup. Their normal pages remain accessible and indexable.
- The current database has no cancellation-history UI. Current deletes yield 404 and disappear from subsequent sitemaps. Source-missing flags are review signals, **not confirmed cancellations**, and are not exposed or converted to cancellation markup. Explicit `eventStatus`/`previousStartDate` data, if maintained by a future authorized backend workflow, renders matching cancellation/postponement/reschedule notices and schema; a reschedule without an original date gets no misleading status schema. No such statuses or dates were inferred or backfilled. For a current reschedule, the updated actual date is shown; an earlier date cannot be reconstructed from a deleted/overwritten record.

## Google Search Console after production release

1. Open Search Console and add a **Domain** property for `summitscene.ca` (no `https://` or path).
2. Copy Google's generated DNS TXT value. At the domain's **authoritative DNS provider**, add that exact TXT record for the root domain (`@` in providers that use it). Do not change nameservers, existing A/CNAME/MX records, or invent the verification value. Wait for DNS propagation, then click Verify. Keep the TXT record in place.
3. In **Sitemaps**, submit `https://summitscene.ca/sitemap.xml`. Confirm its child sitemaps are fetched successfully and don't contain preview hosts, filter URLs or private events.
4. Use **URL Inspection → Test live URL** for `/events`, each town page and a complete real event detail URL. Check returned status, crawl availability, rendered HTML, canonical and mobile layout; request indexing for key pages after they pass.
5. Run an eligible single-event URL through Google's **Rich Results Test**. Confirm structured fields match visible content. Incomplete/recurring/promotion pages intentionally have no Event result. Search features and rankings are not guaranteed.
6. Watch Page indexing and Event enhancement reports after recrawling. Verify removed event URLs become 404 and stale slugs redirect. Filter/authentication pages should not become indexable.

Primary references: [Netlify Functions API](https://docs.netlify.com/build/functions/api/), [Expo iOS Universal Links](https://docs.expo.dev/linking/ios-universal-links/), [Expo Android App Links](https://docs.expo.dev/linking/android-app-links/), [Apple Team ID](https://developer.apple.com/help/glossary/team-id/), [Google Event guidance](https://developers.google.com/search/docs/appearance/structured-data/event), [Search Console verification](https://support.google.com/webmasters/answer/9008080), [Sitemaps report](https://support.google.com/webmasters/answer/7451001), [URL Inspection](https://support.google.com/webmasters/answer/9012289).
