# Mandatory updates and the 1.0.10 rollout

Implementation is prepared only. No release has been published, no production policy has been written, and mandatory updates default to disabled on both platforms.

## Repository findings

- The owner reports iOS **1.0.9** is live; Android is preparing its first build after approval. The next shared release version is **1.0.10** in `app.config.js`, `package.json`, and the lockfile.
- `eas.json` uses `appVersionSource: remote` and production `autoIncrement: true`. EAS owns the actual iOS `CFBundleVersion` and Android `versionCode`. Local iOS `buildNumber: "2"` and Android `versionCode: 3` are baselines, **not verified production build numbers**. Read each final EAS artifact before setting build floors. Do not copy one platform's build number to the other.
- `android/` is generated and gitignored. Its local versionName was 1.0.6 while Expo config was 1.0.9. The local copy was aligned to 1.0.10, but release archives must use a fresh prebuild from app config. Do not rely on a stale native directory. No iOS native directory is tracked.
- The existing `App.js` already wraps the navigation container in `AppUpdateGate`, outside the navigator and inside the account/theme providers. The previous gate checks only at launch, uses `Constants.expoConfig.version`, fails open on errors, and reads one shared minimum from `/api/app-version`.
- The old gate exists in the repository's version-1.0.9 commit (`20cb345`). That is evidence the feature predates this work, **not proof of what was packaged into the live App Store binary**. Verify that artifact or test the installed release against a staging backend before relying on it.
- Existing settings were backend environment variables, not a general remote-settings database. No version-header API rejection middleware or HTTP 426 upgrade enforcement was found.
- App Store ID **6777819596** and bundle/package ID **com.rachellauren.summitscene** are already in the repository. No store identifiers are missing. Their presence does not establish release availability for any particular store account, country, device or track.

## New configuration API

The MongoDB `AppUpdatePolicy` model stores a separate document for `ios` and `android`. No seed or migration is needed to keep requirements disabled. The database's unique platform index and revision checks prevent concurrent changes from overwriting each other.

- `GET /api/app-version`: public schema version 2, with `platforms.ios` and `platforms.android`. No authentication is required to recover from an update gate.
- `GET /api/app-version/admin`: existing bearer authentication **and** existing `isAdmin` authorization. Returns each platform's `revision`, `config`, and update timestamp.
- `PUT /api/app-version/admin/ios` or `/android`: same authorization. Body is `{ "expectedRevision": 0, "config": { ... } }`. Supply the revision just returned by GET; a conflict returns 409 and requires a reload. PUT replaces only that platform's configuration. Changes record the administrator and timestamp.
- Invalid configuration returns 400; database failures return 503. Public responses use `Cache-Control: no-store`. Configuration is validated again when read and by the client. URLs must be the real existing listings; arbitrary remote URLs are rejected.

Use an existing admin session token in a trusted HTTP client. Do not put admin tokens, database credentials or configuration-writing code in the mobile bundle.

Exact **disabled preparation** config for iOS:

```json
{
  "minimumVersion": "1.0.2",
  "minimumBuild": null,
  "latestVersion": "1.0.10",
  "latestBuild": null,
  "mandatoryEnabled": false,
  "storeAvailable": false,
  "storeUrl": "https://apps.apple.com/app/summit-scene/id6777819596",
  "message": "A new version of the app is available. Please update to continue."
}
```

While iOS is being released, **leave Android untouched**. An absent Android document returns this safe default:

```json
{
  "minimumVersion": "1.0.2",
  "minimumBuild": null,
  "latestVersion": "1.0.2",
  "latestBuild": null,
  "mandatoryEnabled": false,
  "storeAvailable": false,
  "storeUrl": "https://play.google.com/store/apps/details?id=com.rachellauren.summitscene",
  "message": "A new version of the app is available. Please update to continue."
}
```

After the corresponding platform release is available to **everyone affected**, use its same full configuration with:

```json
{
  "minimumVersion": "1.0.10",
  "minimumBuild": null,
  "latestVersion": "1.0.10",
  "latestBuild": null,
  "mandatoryEnabled": true,
  "storeAvailable": true
}
```

The last fragment shows fields to change, **not** a complete PUT config: retain that platform's `storeUrl` and `message`, and include a fresh `expectedRevision`. Null builds are an intentional, valid version-only rollout; no unverified build numbers are invented. If a build-only fix needs enforcement, replace `minimumBuild` and `latestBuild` with the actual platform build strings from EAS/store release records. Android builds are positive integer strings; iOS builds are positive numeric strings with up to three dot-separated components. Latest build must be at least minimum build.

Version and build floors are independent: either falling below its configured minimum means unsupported. This follows EAS's monotonically increasing production build counters; if you reset iOS build numbering for a new marketing version, leave the build floor null or review it before release. Version comparison is numeric (`1.10.0 > 1.9.0`), with missing minor/patch components treated as zero. Nonnumeric/prerelease strings are invalid. `latestVersion`/`latestBuild` alone produce an optional decision, never a mandatory block; there is deliberately no new dismissible optional-update popup.

## Enabling and reversing

1. Deploy the backend changes first. Inspect the public response and admin response. Missing platform documents must report `mandatoryEnabled: false`; do not raise the legacy environment minimum as part of deployment.
2. Build and test iOS **1.0.10** with production EAS auto-increment. Record its actual build number and verify the archive's marketing version. The new gate uses `expo-application` to read the installed native binary. A JS/OTA version cannot substitute for a native update.
3. Submit/release iOS first with mandatory updating disabled. Approval, TestFlight availability, or a scheduled release is not sufficient. Verify that the correct binary is installable from the real App Store listing in every supported country and on every supported device/OS. Keep the new release compatible with all users whom the minimum would affect.
4. When availability is confirmed, first set iOS `storeAvailable: true` with `mandatoryEnabled: false` for an optional period if desired. Only then set the iOS minimum and `mandatoryEnabled: true`. Android remains unchanged.
5. Build and submit Android **1.0.10** with its own EAS versionCode. Verify the production listing, supported devices, countries, and eligible accounts after review. A closed/internal test approval does not mean all production users can install it.
6. Enable Android's own minimum only when that Android release is available to everyone affected.

This implementation has global per-platform policies, not country/track/cohort targeting. **Do not enable a global minimum during a restricted/staged rollout.** On Google Play wait until production rollout reaches 100% and verify propagation and device eligibility. For iOS, the conservative policy is to finish the phased release and verify listing propagation before enforcing; Apple permits manual downloads during phased release, but that alone does not verify availability to every affected account. See [Apple phased release documentation](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/) and [Google staged rollout documentation](https://support.google.com/googleplay/android-developer/answer/6346149?hl=en).

To reverse an accidental requirement, GET the admin policy and PUT the same full config with **`mandatoryEnabled: false`** using its current revision. If the release was withdrawn, also set `storeAvailable: false`. There is no minimum-only monotonic restriction: you may lower the minimum as part of rollback. No new app release or backend deploy is needed for these new policies. Active blocked clients retry every minute, on foreground, and on Retry check. A reachable rollback releases them at the next successful check.

## Reliability, navigation and existing installations

- At launch the check waits at most 8 seconds, including a hung response body. Network/HTTP/JSON/schema failures with no confirmed requirement allow the app to open. Unknown native identity/build data never fabricates a version zero and blocks the user.
- Recheck on each foreground transition, including return from the store. Background checks do not replace the navigator with a loading screen. A confirmed mandatory block removes the navigator, consumes Android hardware Back, and has no dismiss action. Deep links and notification navigation have no mounted navigation target. The screen includes the required title/message/button, retry, store-opening errors, accessible controls, scalable text, a scrollable layout, and existing theme/button components.
- Store links use HTTPS to open the correct real listing, including a web fallback handled by the OS. On failure, the gate remains and offers retry and manual store-search guidance. Returning without installing remains blocked if the policy is still valid.
- There is **no persistent update-policy cache**. A validated server decision has a five-minute in-memory lease. A transient failure cannot dismiss a recent confirmed requirement, but when its lease expires it ceases to block until another successful confirmation. This avoids indefinite lockout after an outage or unobservable rollback. Offline relaunch fails open. Responses and retries bypass HTTP caches.
- AuthProvider remains outside the gate. Tokens, account data, saved events and device storage are not deleted or reset. Navigation may remount after a real mandatory gate, so unsaved form state is not guaranteed.
- **Existing iOS 1.0.9 installations cannot learn the new platform policy retroactively.** If their shipped binary matches the repository gate, they can show its older screen through the original shared `minimumSupportedVersion` field. They only check at launch; they have no native-build support, new retry UI or foreground recheck. Binaries without any checker cannot display either screen until updated.
- The public endpoint intentionally retains legacy top-level `minimumSupportedVersion`, `latestVersion`, `iosStoreUrl`, `androidStoreUrl`, `message` and `optionalUpdateMessage`. The first two continue to come from backend `MIN_SUPPORTED_APP_VERSION`/`LATEST_APP_VERSION` (fallback 1.0.2). **Do not raise the shared legacy minimum during the iOS-first rollout:** legacy requests do not identify their platform. New policies do not change these old fields.
- Eventually, only after both stores offer the replacement to every affected legacy user and the old binary is verified to have the gate, the existing backend environment setting `MIN_SUPPORTED_APP_VERSION=1.0.10` (and `LATEST_APP_VERSION=1.0.10`) can request upgrades from legacy clients on their next cold launch. Reverse that older mechanism by restoring the previous minimum environment value and reloading/redeploying the backend configuration. It is shared across platforms, unlike the new authenticated configuration API.
- There is no existing safe hard API cutoff by version to integrate. Do not block missing version headers: old clients do not send them and would get generic failures. Client-reported headers are spoofable and are **not a security boundary**. This gate is a cooperative compatibility feature and cannot guarantee that every offline, modified, or checker-free old app stops working. Continue server-side authorization/data validation and backwards-compatible API behavior.

## Verification and release-device checks

Run the isolated update tests without connecting to production MongoDB:

```powershell
npm run test:app-updates
node node_modules/mocha/bin/mocha.js --exit --timeout 10000 server/test/appUpdate.test.js server/test/eventCategory.test.js server/test/eventImporter.test.js
node node_modules/expo/bin/cli export --platform ios --platform android --output-dir .tmp-update-export
```

Update tests cover numeric comparisons, native platform builds, optional/required/disabled decisions, malformed configuration, store URLs, unavailable stores, HTTP/timeouts/offline launch, lease expiry, foreground/store returns, rollback, authorization, independent writes and concurrent revision conflicts. Persistence is isolated in memory; the real MongoDB deployment should also be smoke-tested against a staging database. The broad API suite starts the server and uses database-mutating integration fixtures, so it is not a substitute for isolated release checks against production.

Completed locally: 16 update tests and 52 existing category/importer tests pass (68 total); Expo public-config validation reports 1.0.10; iOS and Android production JavaScript/Hermes exports succeed. These exports are not signed native builds or store submissions. The generated export directory was removed afterward. Native device tests and live MongoDB/store integration remain release-stage checks.

Before submission, on native iOS and Android builds against staging: verify the real installed version/build, force a requirement above that build, press Android Back, open a deep link and event notification, verify no navigation bypass, test large text/VoiceOver/TalkBack, deny store opening, return without installing, disable remotely, and verify the account and saved events remain. Repeat on the new build with the intended floor to confirm it is supported. These device/store checks require real artifacts and must precede activation.

Files: `app.config.js`, `package.json`/lockfile, `components/AppUpdateGate.js`, `components/common/AppButton.js`, `services/appVersionApi.js`, `utils/appUpdatePolicy.js`, `utils/appUpdateController.js`, `server/models/AppUpdatePolicy.js`, `server/routes/appVersion.js`, `server/index.js`, `server/test/appUpdate.test.js`, and this runbook. Existing navigation placement in `App.js` is retained.
