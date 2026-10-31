# Activate the 1.0.11 update requirement

The existing app already has a blocking update screen with Update app and Retry check buttons. It covers the navigation container and cannot be dismissed with Android Back. Users on 1.0.11 or newer are allowed through. Configuration alone does not send a system notification or install the update: supported apps check on launch and when returning to the foreground.

## Current live state checked October 31, 2026

- The production `/api/app-version` endpoint is healthy.
- Both platform policies currently have `mandatoryEnabled: false`, with a minimum of 1.0.2.
- The separate legacy response has `minimumSupportedVersion: 1.0.10` and `latestVersion: 1.0.10`.
- Apple's public Canadian lookup reports iOS 1.0.11. This does not verify every country's store availability, device compatibility, or the contents of that shipped binary.
- Android's public listing is available, but its 1.0.11 version and rollout percentage were not independently verified.
- No production settings were changed by this work. The activation command requires your existing Summit Scene administrator login.

## 1. Confirm people can install the target version

Check App Store Connect and Google Play Console. Version 1.0.11 must be available to all affected users on each platform you enable. For Android, use the Production release at 100%, not a closed test or partial rollout. Also check country and device eligibility, and verify a real phone offers the update.

Only enable iOS if Android is not ready. A forced update cannot be completed by a user who is not eligible to download the release.

## 2. Deploy the configuration helper change

The existing production API already supports this operation; no mobile rebuild is needed to activate the checker in installations that already contain it. The helper now sets a clear version-specific message:

> Summit Scene 1.0.11 is available. Please update to continue using the app.

Run the helper from your repository's terminal. Its local changes do not require a backend deploy when the existing API is already serving schemaVersion 2, as verified above.

## 3. Enable the supported app checker

For iOS first:

```powershell
npm run configure:app-updates -- --platform ios --version 1.0.11
```

Enter your **Summit Scene admin account** email and password in the terminal. This is not your Apple, Google, or Render login. The password is hidden and is not saved. Review the before/after settings, then type:

```text
ENABLE ios 1.0.11
```

Once Android is fully available, enable it separately:

```powershell
npm run configure:app-updates -- --platform android --version 1.0.11
```

Confirm with `ENABLE android 1.0.11`.

If **both** stores are ready, you can instead enable both in one command:

```powershell
npm run configure:app-updates -- --platform both --version 1.0.11
```

Confirm with `ENABLE both 1.0.11`. Each platform is saved separately; if the second fails, the first successful save remains active. The command reads current revision numbers and refuses to overwrite concurrent changes.

## 4. Cover the older shared-version checker

Older app versions may read the legacy fields rather than the new platform policies. To raise their minimum, after **both platforms are ready**, open Render → summit-scene-backend → Environment and set:

```dotenv
MIN_SUPPORTED_APP_VERSION=1.0.11
LATEST_APP_VERSION=1.0.11
APP_UPDATE_MESSAGE=Summit Scene 1.0.11 is available. Please update to continue using the app.
```

Save and let Render redeploy/restart the service. These must be Render runtime settings; editing `server/.env` locally does not change production.

This legacy minimum is shared across platforms. Do not raise it for iOS alone if Android users cannot yet install 1.0.11. Platform policy activation and legacy environment activation are two separate settings; changing one does not change the other.

## 5. Verify the live result

```powershell
$updateSettings = Invoke-RestMethod "https://summit-scene-backend.onrender.com/api/app-version"
$updateSettings.platforms | ConvertTo-Json -Depth 5
$updateSettings | Select-Object minimumSupportedVersion, latestVersion, message
```

For every enabled platform, confirm:

```json
{
  "minimumVersion": "1.0.11",
  "minimumBuild": null,
  "mandatoryEnabled": true,
  "storeAvailable": true
}
```

The output also includes a real platform store URL and the new message. Latest version may legitimately be newer than 1.0.11; the helper preserves a newer existing latest version.

On a phone with a supported older installed release, close/reopen the app or background/foreground it. Verify that Update required blocks access and Update app opens the correct store. Update to 1.0.11 and verify the app opens normally. Test both platforms using the actual older store builds; a local repository checker does not prove which code those binaries contain.

## Roll back

```powershell
npm run configure:app-updates -- --platform both --disable
```

Confirm `DISABLE both`. If you changed the legacy Render variables, also restore their previous values, 1.0.10 in the checked live configuration. Restore the previous legacy message as appropriate. New clients recheck on foreground; blocked clients also recheck every minute while active. Older launch-only checkers may need a restart.

## Coverage and release limits

- You cannot retroactively add a popup to an installed binary that has no update checker. Users of such a binary need to update through the store first.
- The current checker intentionally allows an offline launch. A confirmed requirement is retained for at most five minutes without successful revalidation, so a server outage or inaccessible rollback cannot indefinitely lock people out. This is not backend API access enforcement.
- People already using 1.0.11 or a newer version should not receive the blocking screen.
- This activation does not deliver unshipped local changes. If the Home loading fix or new account changes were made after the published 1.0.11 binary was built, they require a later store release (for example 1.0.12) or a compatible existing OTA update mechanism. Do not claim the published 1.0.11 contains those changes without checking its build.

Run `npm run test:app-updates` for isolated validation; it does not connect to production MongoDB or activate a policy.

References: [Google staged rollout eligibility](https://support.google.com/googleplay/android-developer/answer/6346149), [public iOS version lookup](https://itunes.apple.com/lookup?id=6777819596&country=ca).
