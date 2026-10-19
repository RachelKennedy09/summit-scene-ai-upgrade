# Anonymous app usage analytics

Deploy the backend before releasing the updated app. No sign-in is required to record usage; the existing authenticated, server-authorized admin Analytics screen remains protected. Nothing has been deployed or published by this change.

The Analytics screen now shows:

- App opens: cold launches or foreground returns after at least 30 minutes away. Permission dialogs and short returns do not create another visit.
- Active installations: distinct installation identifiers with a recorded visit in the selected 7/30/90-day or all-time period.
- First recorded opens: each installation's first recorded visit. This includes existing users first running this instrumentation and is **not a download count**.
- Returning installations: installations with a recorded visit after their first visit. These may overlap first recorded opens in the selected period.
- Rolling active installations for the last 24 hours, 7 days, and 30 days, independent of the selected period.
- Platform totals and the top 50 platform/version/native-build combinations. An installation that updates within the period can appear in more than one version row; do not sum those rows to estimate unique installations.
- Existing event/business engagement metrics. The misleading “Unique sessions” label is now “Engaged installations.” Its existing API property `uniqueSessions` is retained for compatibility and excludes app-open-only activity.

## Collection and reliability

`AppUsageTracker` runs after the update gate and auth bootstrap, using the same persisted random `analyticsSessionId` as existing event analytics. Identity initialization is shared and serialized so simultaneous events use one identifier. App opens record a separate visit ID, platform, native application version and native build. They do not store a user's name, email, account ID, contacts, advertising ID, precise location or hardware fingerprint. Existing event analytics keep their prior behavior.

The `app_open` event uses the existing optionally authenticated `/api/analytics/track` endpoint. Inputs are allowlisted; signed-in admins are skipped server-side as well as client-side. Developer builds, Expo Go and web do not send these native usage events. An administrator using the public app while logged out is indistinguishable from another guest and can be counted. TestFlight/preview release builds can count if their user is not a signed-in admin.

Failed reports are queued in local storage and retried on foreground or every minute while active. Only the latest 20 unsent opens are retained to bound storage. A repeated report uses the same visit ID and the server's unique dedupe index prevents double-counting. Analytics failures never block navigation. Network attempts have a five-second timeout. Reporting timestamps are server receipt times: delayed/offline reports appear when received, not at their exact original offline activity time. Missing reports and dropped queues can undercount.

`AnalyticsInstallation` stores the first visit ID and first/last server-observed timestamps. The server determines first versus returning, rather than trusting a client flag. Existing installation records are not backfilled or relabelled as downloads. An interrupted first report is retried with the same visit ID. Storage reset, reinstall, backup restoration and use of several devices can affect these estimates. Client-generated identifiers are not proof of unique people or authentic traffic.

The summary endpoint returns an additional `appUsage` object without changing existing event/business fields. Its MongoDB aggregate uses distinct installation IDs for activity counts and indexed app-open/time filtering. No individual installation identifiers are exposed by the admin summary.

## Release and verification

1. Deploy the backend/model changes and verify creation of the unique installation and dedupe indexes in staging.
2. Test a release-mode native build against staging as a guest: launch, briefly background and return, then simulate a 30-minute return. Check that only the expected visits appear.
3. Test offline reporting and subsequent reconnection; retries must not duplicate app opens. Check first/returning counts, rolling windows and platform/version breakdowns in staging MongoDB.
4. Log in as admin and verify new signed-in admin activity does not inflate counts. Confirm guests and non-admins cannot access summary reports.
5. Include these changes in the next iOS/Android native build. An already-created build must be rebuilt to include them. Review the store privacy/data-safety disclosures for the actual collected identifier and usage data. The in-app legal text and repository privacy page have been updated; the hosted page still needs normal deployment.

Run `npm run test:app-usage` for the isolated usage suite. Tests use isolated persistence substitutes, never production MongoDB. The combined usage/update/category/importer suites pass 78 tests, and both iOS and Android JavaScript/Hermes exports succeed. Live MongoDB aggregation and physical-device checks remain staging/release checks.

Download totals and current installed audience remain available in App Store Connect / Google Play Console. No store-report integration or store credentials were added. Usage tracking starts with this updated app; historical opens cannot be reconstructed.
