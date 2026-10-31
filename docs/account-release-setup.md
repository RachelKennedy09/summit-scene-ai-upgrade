# Summit Scene accounts: setup and release

The app now exposes Home, Map, Saved, and Account. Browsing remains public. Members can create an email account, sign in with Google or Apple, save events, like events, choose saved-event reminders, and enable the existing daily event update. Existing Going actions and their analytics are preserved. Community stays hidden, including event buddy posts. Business and admin screens retain their existing tools.

Code is implemented locally. Developer-account configuration, production deployment, native builds, and real-device acceptance testing are still required. Local `.env` files do **not** update Render or EAS automatically.

## 1. Configure Google sign-in

Use the same Google Cloud project for all OAuth clients.

1. Open Google Cloud Console → Google Auth Platform (OAuth consent screen / Credentials in some console layouts).
2. Configure the app name, support email, authorized domains, and privacy-policy URL. If the consent configuration is in Testing, add your testing Google accounts. Complete the production publishing requirements before public release.
3. Create or locate a **Web application OAuth client**. Its client ID goes in both places:
   - App / EAS: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
   - Render backend: `GOOGLE_WEB_CLIENT_ID`.
   These two values must match. The Web client ID is the audience of the ID token validated by the server; do not use the Android client ID here.
4. Create or locate an **iOS OAuth client** for bundle ID `com.rachellauren.summitscene`.
   - App / EAS: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` = its iOS client ID.
   - App / EAS: `GOOGLE_IOS_URL_SCHEME` = its reversed client ID, for example `com.googleusercontent.apps.123456-example`.
   `app.config.js` already passes this scheme into the Google Sign-In native plugin.
5. Create or locate **Android OAuth clients** for package `com.rachellauren.summitscene`. Register the SHA-1 fingerprints for the signing certificates you actually use: development/preview builds and the Google Play App Signing certificate can differ. Get the Play certificate from Play Console → App integrity, and EAS signing certificates through `npx eas-cli credentials --platform android`.
6. Set the app values in the root `.env` for local use and in EAS Environment Variables for each environment you build. Production builds already use EAS's `production` environment in `eas.json`.

Public client IDs are safe to embed in the app. Do not add OAuth client secrets to `EXPO_PUBLIC_*` variables.

Existing accounts are never silently merged by matching email. If Google reports that the email already has an account, sign in using the original method, open Account, and connect Google there. Connecting a provider explicitly uses the logged-in account's JWT. A provider already connected to somebody else cannot be linked.

References: [Expo Google authentication](https://docs.expo.dev/guides/google-authentication/), [Google Sign-In Expo setup](https://react-native-google-signin.github.io/docs/setting-up/expo).

## 2. Configure Apple sign-in and deletion

Apple sign-in is offered on supported iOS devices. Android members can use Google or email.

1. Open Apple Developer → Certificates, Identifiers & Profiles → Identifiers.
2. Select App ID `com.rachellauren.summitscene` and enable **Sign in with Apple**. Complete any primary App ID configuration Apple requests.
3. Under Keys, create or select a key with **Sign in with Apple** enabled and associated with this App ID. Download its `.p8` file and keep it private. Record its Key ID and your Apple Team ID.
4. In **Render → summit-scene-backend → Environment**, set:

   ```dotenv
   APPLE_BUNDLE_ID=com.rachellauren.summitscene
   APPLE_TEAM_ID=your_team_id
   APPLE_KEY_ID=your_sign_in_with_apple_key_id
   APPLE_PRIVATE_KEY=the_complete_contents_of_the_p8_file
   ```

   Render can store a multiline private key. The backend also accepts literal `\n` separators. The complete `BEGIN PRIVATE KEY` and `END PRIVATE KEY` lines are required. These values belong on the backend, never in EAS public variables or source control. `*.p8` is now ignored by Git.
5. Preserve the existing production `JWT_SECRET`. Apple refresh tokens are encrypted using a key derived from it. Changing it without a token migration would invalidate sessions and prevent decrypting stored Apple refresh tokens; preserve it in your server-secret backups.
6. Create a **new iOS native build** after enabling capabilities. `app.config.js` already includes `expo-apple-authentication` and `usesAppleSignIn: true`; EAS will need provisioning credentials with the capability enabled.
7. Test Apple sign-in with **Share My Email** and **Hide My Email**. Apple may provide a name only on first authorization; the simple profile screen lets a member correct the display name afterward.
8. Test in-app Delete account. The backend revokes Apple authorization before deleting local account data. If Apple's service is unavailable, deletion remains retryable. An older Apple account without a stored refresh token must reconnect Apple from Account before deletion.

The server now exchanges Apple's one-use authorization code and stores an encrypted, non-public refresh token specifically for account revocation. Configure the key before releasing the new Apple sign-in flow. If you use Apple private relay email for password-reset/verification messages, register your sending domain/address with Apple's private email relay configuration as well.

References: [Expo Apple authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/), [Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

## 3. Configure email and notifications

1. In Render, confirm existing `MONGODB_URI`, `JWT_SECRET`, and `NODE_ENV=production`. Keep their real values private.
2. Set `EMAIL_DELIVERY_ENABLED=true` and configure the existing Resend integration (`RESEND_API_KEY` and a verified `EMAIL_FROM` sender), or the existing SMTP integration. Test delivery; a successful signup alone does not prove email was sent.
3. Set `APP_PUBLIC_URL=https://summitscene.ca`. Test actual verification and password-reset links from an email. They must open the deployed verification/reset pages and complete against the backend.
4. Set `PUSH_NOTIFICATIONS_ENABLED=true` on Render. The existing daily notification job runs inside the backend process, normally every 15 minutes. Keep the backend on an active paid compute instance. Alerts can arrive after the selected time by up to the scheduler interval, plus push-service delay.
5. For Android push, configure Firebase Cloud Messaging V1 credentials for the EAS project. Upload the **service-account credential to EAS credentials**, not the app bundle.
6. Add Android's `google-services.json` as an EAS **File** environment variable named `GOOGLE_SERVICES_JSON`. The app already reads this path in `app.config.js`. The Firebase app's package must match Summit Scene. This file is distinct from the server service-account credential.
7. For iOS push, configure APNs credentials through `npx eas-cli credentials --platform ios`, using the same Apple team and app identifier.
8. Build and install a native development or production app. Expo Go is insufficient for verifying this complete sign-in/push flow.
9. Open Account → Daily What's Happening, enable it, and choose town/time. The permission request happens when enabling notifications. Account creation and Likes do not subscribe someone to alerts.

Saved-event reminders use the existing **device-local notification scheduler**. The preference is saved in MongoDB and synchronized when signing in or opening Saved. A device must open the app to pick up changes made elsewhere; reminders are not a server push campaign. A member who enables reminders on multiple devices can receive them on each device. Local reminders may also remain based on the last synchronized event time until the app refreshes. Server-driven event-change alerts and guaranteed one-device delivery are not part of this release.

References: [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [Android FCM credentials](https://docs.expo.dev/push-notifications/fcm-credentials/).

## 4. Deploy the backend, then build the app

1. Review and commit the account changes, examples, tests, and this guide. Do not commit `.env` files, `.p8` keys, or private service-account credentials.
2. Push the branch used by your Render service and let it deploy, or trigger a deployment from Render. Confirm the runtime environment variables from the previous sections are set **in Render**.
3. Check `https://summit-scene-backend.onrender.com/api/health` returns JSON with `status: "ok"`, and that `/api/events?limit=1&page=1` loads. A 503 suspension or 502 response must be resolved before testing accounts.
4. Run the offline account checks from the repository root:

   ```powershell
   npm run test:accounts
   ```

   These tests stub the database/provider calls and do not create production accounts.
5. Confirm the app's `EXPO_PUBLIC_API_BASE_URL=https://summit-scene-backend.onrender.com` in EAS. Set the OAuth values and Firebase file variable there too. If testing with the preview profile, populate EAS's preview environment as well.
6. Build new app binaries:

   ```powershell
   npx eas-cli build --platform android --profile production
   npx eas-cli build --platform ios --profile production
   ```

7. Submit to testing tracks first:

   ```powershell
   npx eas-cli submit --platform android --profile closedTesting
   npx eas-cli submit --platform ios --profile production
   ```

   Android's `closedTesting` profile already targets the `alpha` track in `eas.json`; confirm that track is the intended closed test in Play Console. The iOS upload appears in App Store Connect for TestFlight; it does not automatically publish the release.
8. Complete the acceptance checks below, then release through Play Console and App Store Connect. Native OAuth configuration and entitlement changes require a new binary; restarting Metro alone is insufficient.

## 5. Acceptance checks before release

Use a non-admin account for member and analytics testing. Existing analytics intentionally skips administrator activity.

| Check | Expected result |
| --- | --- |
| Guest browsing | Home/Map work; Community stays hidden. Saved/Account explain signup. |
| Email signup | Name/email/password/terms create an account; optional profile setup follows; verification email arrives. |
| Google on Android and iOS | First sign-in creates one account; subsequent sign-in returns to it. Cancellation causes no error popup. |
| Apple on iPhone | New and returning sign-in work, including Hide My Email; profile setup is short. |
| Existing email account | Matching provider email asks you to sign in first; connecting from Account preserves the same user and saves. |
| Guest Save/Like | Tap the action, sign in or sign up, complete the profile if prompted; return to the event and complete the original action once. |
| Save and Like | They toggle independently; Saved and Liked lists show the correct events after navigating back. |
| Cross-device | Sign into the same account on another device; Saved/Liked lists match. |
| Reminder | Saving alone does not ask permission. Selecting a reminder asks permission and schedules a local alert. Unsave cancels that event's saved reminder. |
| Notification denial | The app explains how to enable permission; browsing, saves, and likes still work. |
| Daily update | Enable town/time settings; receive push while the app is backgrounded; tapping opens today's events. Disable and confirm no later daily updates. |
| Outage | With a saved login, temporarily block networking and restart. Browsing can open without deleting credentials. Restore networking and retry saved login from Account. |
| Expired session | A JSON 401 from the real API clears invalid credentials and allows a fresh login. |
| Delete account | Test email, Google, and Apple accounts. Confirm account preferences and push tokens are deleted, and Apple authorization is revoked. |
| Existing tools | Admin login, business approval, Manage, imports, and existing event editing still work. |

No destructive migration is required. `liked` defaults to false on existing EventPreference records. Existing saves and reminder settings remain intact. The existing unique `(userId, eventId)` index provides one preference per member/event. `appleRefreshToken` is an optional new field excluded from normal queries and safe-user responses. Normal expiration cleanup of preferences for past events remains unchanged.

## Existing analytics: verify before adding anything else

The pasted analytics specification largely describes code already present:

| Existing file | Responsibility |
| --- | --- |
| `server/models/AnalyticsEvent.js` | MongoDB analytics events, validated types, date/reporting indexes, unique dedupe key. |
| `server/controllers/analyticsController.js` | Server-side event/business attribution, tracking, date-filtered summaries, and protected business/source reports. |
| `server/routes/analytics.js` | Optional-auth tracking and existing authenticated report routes. Report controllers check admin access. |
| `services/analyticsApi.js`, `utils/analyticsIdentity.js` | Reusable non-blocking tracking, persisted anonymous identity, client impression cache. |
| `screens/hub/HubScreen.js` | Impressions using FlatList visibility callbacks. |
| `screens/events/EventDetailScreen.js` | Event view, existing save action, shares, and event website clicks. Existing Going controls and their action tracking are preserved. |
| `components/events/EventHostSection.js`, `components/account/MemberProfileModal.js` | Existing business-profile view and website-click tracking. |

Do not create a second model, tracking route, identity, or save system. No paid analytics service or new analytics environment variable is needed. Imported-event provenance fields already exist on Event, and event ownership references User through `createdBy`; there is no separate Business collection to introduce.

For manual verification, browse an event into view, open it, save it, share it, open the host profile, and follow a website link using a non-admin member or guest as appropriate. Use MongoDB's existing analytics collection:

```javascript
// mongosh / MongoDB Compass playground; no private user data is needed.
db.analyticsevents.find({}, { type: 1, eventId: 1, businessId: 1, createdAt: 1, metadata: 1 }).sort({ createdAt: -1 }).limit(20)
db.analyticsevents.countDocuments({ type: "event_view", eventId: ObjectId("YOUR_EVENT_ID") })
db.analyticsevents.countDocuments({ type: "event_save", "metadata.action": "added" })
db.analyticsevents.aggregate([
  { $match: { type: "event_impression", sessionId: { $type: "string" } } },
  { $group: { _id: "$dedupeKey", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

Existing admin API examples (replace the placeholder JWT locally; do not share it):

```powershell
$analyticsHeaders = @{ Authorization = "Bearer YOUR_ADMIN_JWT" }
Invoke-RestMethod "https://summit-scene-backend.onrender.com/api/analytics/summary?days=30" -Headers $analyticsHeaders
Invoke-RestMethod "https://summit-scene-backend.onrender.com/api/analytics/business/YOUR_BUSINESS_USER_ID?days=90" -Headers $analyticsHeaders
```

Supported day filters are `7`, `30`, `90`, and `all`; other values fall back to 30 days. This account update preserves the existing analytics. Before using those reports for paid business claims, audit added-versus-removed save counting, raw metadata/source-URL privacy filtering, rate limiting, and top-event ranking limits. The current summaries count event records, so they should not yet be presented as a verified count of saves added. Likes are a preference feature in this release and do not introduce a new analytics type.

## Account implementation file map

New files:

| File | Why it exists |
| --- | --- |
| `screens/auth/MemberRegisterScreen.js` | Short public email signup and provider buttons; delegates organizer signup to the existing business flow. |
| `screens/account/MemberAccountScreen.js` | Guest signup entry and simple member settings; delegates business/admin accounts to their existing screen. |
| `screens/account/MemberProfileScreen.js` | Display name, optional photo, town, and interests. |
| `utils/accountNavigation.js` | Resume guest event intent after authentication/profile setup; classify real session invalidation. |
| `server/services/appleAccountService.js` | Apple code exchange, encrypted refresh-token storage, and revocation. |
| `server/test/memberAccounts.test.js` | Offline recovery, navigation, preference, provider-linking, and Apple lifecycle checks. |
| `docs/account-release-setup.md` | This configuration and release guide. |

Modified files:

| File | Change |
| --- | --- |
| `navigation/TabNavigator.js` | Expose Saved and Account to everyone, retain restricted Manage. |
| `navigation/RootNavigator.js` | Route public signup and simple profile; remove forced community safety onboarding and hidden community creation routes. |
| `screens/auth/LoginScreen.js` | Restore public signup/provider entry and resume intended event actions. |
| `screens/auth/RegisterScreen.js` | Return the existing organizer signup flow to Account after successful registration. |
| `screens/hub/HubScreen.js` | Update the old Admin login footer to describe public account access. |
| `components/auth/SocialSignInButtons.js` | Provider navigation, authenticated linking, iOS client ID, Apple code, and Android-only Play Services check. |
| `context/AuthContext.js` | Preserve credentials on outages, hold pending actions, pass linking authentication, sync reminders at login. |
| `screens/account/SavedEventsScreen.js` | Guest prompt, Saved/Liked filters, focus refresh, reminder reconciliation. |
| `screens/account/NotificationsScreen.js` | Member-focused empty-state explanation. |
| `screens/events/EventDetailScreen.js` | Separate Like and Save, aggregate count, guest intent resumption; preserve Going and hide buddy social UI. |
| `services/eventPreferencesApi.js` | Reuse existing preference API plus public aggregate like-count request. |
| `server/models/EventPreference.js` | Optional liked flag alongside existing saved/reminder fields. |
| `server/controllers/eventPreferenceController.js` | Independently update likes, expose count only, ensure unsave disables reminders. |
| `server/routes/eventPreferences.js` | Public count endpoint; all member preference operations remain authenticated. |
| `server/models/User.js` | Optional private encrypted Apple refresh token. |
| `server/routes/auth.js` | Match provider identity within one verified array element; require explicit authenticated email-account linking; exchange Apple's code. |
| `server/routes/users.js` | Revoke Apple before deletion and remove notification delivery records. |
| `server/middleware/auth.js` | Return 503 for account-service failures instead of misclassifying them as invalid JWTs. |
| `utils/eventReminderNotifications.js` | Background reminder synchronization never triggers permission prompts. |
| `utils/pushNotifications.js` | Create Android notification channel before permission request. |
| `.env.example`, `server/.env.example` | Document client/provider/push configuration without real credentials. |
| `.gitignore` | Exclude Apple private keys. |
| `package.json` | Add `npm run test:accounts`. |
