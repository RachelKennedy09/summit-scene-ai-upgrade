# Summit Scene Android Release Notes

Last updated: June 8, 2026

## App Information

- App name: Summit Scene
- Android package: `com.rachellauren.summitscene`
- Privacy Policy URL: `https://summitscene.ca/privacy`
- Terms URL: `https://summitscene.ca/terms`
- Account deletion URL: `https://summitscene.ca/delete-account`
- Support URL: `https://summitscene.ca/support`

## Google Sign-In Setup

The app includes Android Google Sign-In support through `@react-native-google-signin/google-signin`.

Before building for Android:

1. Create or open the Firebase project for Summit Scene.
2. Add an Android app with package `com.rachellauren.summitscene`.
3. Add the debug and release SHA-1/SHA-256 fingerprints for the build keystore.
4. Download `google-services.json`.
5. Keep `google-services.json` out of GitHub.
6. Make the file available during EAS build and set:

```env
GOOGLE_SERVICES_JSON=./google-services.json
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_oauth_client_id
```

Backend production env must also include:

```env
GOOGLE_WEB_CLIENT_ID=your_web_oauth_client_id
```

The web OAuth client ID is what the backend uses to verify Google ID tokens.

## Play Store Review Notes

Recommended review text:

Summit Scene is a local events, tours, and community discovery app for Banff, Canmore, Lake Louise, and nearby areas. Users can create accounts with email/password. Android builds also support Google Sign-In when configured.

Demo credentials:

- Local member: `apple-review-local@summitscene.ca`
- Organizer: `apple-review-organizer@summitscene.ca`
- App Review organizer: `reviewer@summitscene.ca`
- Password for all demo accounts: `SummitApple2026!`

The App Review organizer account can browse populated event/community content, use community features, and create/edit/delete its own event listings. It does not have admin controls.

No special equipment is required. The app can be reviewed on a standard Android device with internet access. Location sharing is optional; reviewers can browse by town without granting location permission.

Account deletion:

- In app: Account > Delete Account
- Public instructions: `https://summitscene.ca/delete-account`

User generated content and safety:

- Users can create community content, buddy/plan posts, replies, comment replies, and likes.
- Users can report fake events, scams, inappropriate content, misleading businesses, profiles, posts, replies, events, and tours.
- Users can block other users.
- Summit Scene uses server-side content filtering and an admin moderation queue.

External bookings:

- Some event/tour listings link to external organizer websites or booking services.
- Bookings, payments, refunds, cancellations, and support happen outside Summit Scene with the organizer or third-party provider.

## Android Build Checklist

- Confirm package is `com.rachellauren.summitscene`.
- Confirm `EXPO_PUBLIC_API_BASE_URL` points to the production API.
- Confirm Google Maps Android API key is restricted to the Android package and release SHA.
- Confirm `google-services.json` is available to EAS but not committed.
- Confirm Google Play App Signing SHA fingerprints are added to Firebase after Play creates them.
- Confirm privacy/data safety answers match the production build.
- Confirm account deletion works in the installed build.


