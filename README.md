# Summit Scene

Summit Scene is a full-stack Expo React Native app for local events, tours, community posts, groups, buddy plans, and organizer profiles around Banff, Canmore, Lake Louise, and nearby mountain towns.

The repo folder is `summit-scene-ai-upgrade`.

## What Is Included

- Expo React Native mobile app
- Node.js and Express REST API
- MongoDB Atlas database
- JWT email/password authentication
- Sign in with Apple for iOS
- Google Sign-In support for Android production builds
- Event and tour discovery with categories, vibe tags, maps, saved events, and going/interested states
- Community posts, replies, nested reply threads, likes, reports, and blocking
- Business and tour organizer profiles with manual Verified Local Organizer review
- Static public legal/support site in `landing/`

## Project Structure

```text
summit-scene-ai-upgrade/
  App.js
  app.config.js
  app.json
  package.json
  assets/
  components/
  constants/
  context/
  docs/
  landing/
  navigation/
  screens/
  services/
  server/
```

## Prerequisites

- Node.js LTS
- npm
- Expo CLI through `npx expo`
- MongoDB Atlas connection string
- Android Studio for Android emulator/native builds
- Xcode/macOS for iOS native builds
- EAS CLI for store builds

## Environment Files

Create a root `.env` for the mobile app:

```env
EXPO_PUBLIC_API_BASE_URL=https://summit-scene-backend.onrender.com
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY=your_android_maps_key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_oauth_client_id
GOOGLE_SERVICES_JSON=./google-services.json
```

Create `server/.env` for the backend:

```env
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_long_random_secret
NODE_ENV=development
APPLE_BUNDLE_ID=com.rachellauren.summitscene
GOOGLE_WEB_CLIENT_ID=your_google_web_oauth_client_id
ADMIN_EMAILS=your_admin_email@example.com
EMAIL_PROVIDER=disabled
```

Keep `.env`, `server/.env`, `google-services.json`, API keys, and secrets out of GitHub.

## Install Dependencies

From the repo root:

```bash
npm install
cd server
npm install
cd ..
```

## Run The Backend Locally

```bash
cd server
npm start
```

The API runs on `http://localhost:4000` by default.

Health check:

```text
http://localhost:4000/api/health
```

## Run The Mobile App Locally

From the repo root:

```bash
npm run start:clear
```

For a physical phone, tunnel mode is usually most reliable:

```bash
npm run start:tunnel
```

If testing against your local backend from a phone, set the API URL to your computer's LAN IP:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:4000
```

Then restart Expo with cache cleared.

## Android Development

Android package name:

```text
com.rachellauren.summitscene
```

Run on Android:

```bash
npm run android
```

Google Sign-In requires a production/dev build, a Firebase Android app, `google-services.json`, and the matching SHA-1/SHA-256 fingerprints added in Firebase/Google Cloud. It will not be fully testable in plain Expo Go.

## iOS Development

iOS bundle identifier:

```text
com.rachellauren.summitscene
```

Run on iOS:

```bash
npm run ios
```

Sign in with Apple requires the Apple Developer capability enabled for the app identifier and a native build.

## Backend Scripts

Run tests:

```bash
cd server
npm test
```

Seed/reset demo data:

```bash
cd server
npm run reset:demo-data
```

Create App Review demo accounts:

```bash
cd server
npm run create:app-review-accounts
```

If MongoDB Atlas blocks your current IP, add your IP in Atlas Network Access or run the script from an environment that can reach the production database.

## App Review Demo Accounts

Default password:

```text
SummitApple2026!
```

- Local member: `apple-review-local@summitscene.ca`
- Verified organizer: `apple-review-organizer@summitscene.ca`
- Main admin: `admin@summitscene.ca`
- App Review organizer: `reviewer@summitscene.ca`

Reviewers do not need special equipment beyond a normal iPhone, iPad, or Android device with internet access. Location sharing and photo library access are optional; users can browse by town without granting location permission.

Full Apple notes: `docs/apple-submission/README.md`

Android/Google Play notes: `docs/android-release/README.md`

## Public Legal Site

The static public site lives in `landing/`.

Important URLs after deploying `landing/` to `summitscene.ca`:

- `https://summitscene.ca/privacy`
- `https://summitscene.ca/terms`
- `https://summitscene.ca/delete-account`
- `https://summitscene.ca/support`
- `https://summitscene.ca/safety`
- `https://summitscene.ca/community-guidelines`
- `https://summitscene.ca/business`

## Production Build Notes

- Backend runs on Render.
- Database is MongoDB Atlas.
- Public site can be deployed to Netlify from `landing/`.
- Mobile builds should be made with EAS.
- Store builds must use production API URLs, not local IPs.
- Email delivery can be disabled with `EMAIL_PROVIDER=disabled` while avoiding Resend usage.

## Verification Commands

```bash
cd server
npm test
cd ..
npx expo export --platform web
npx expo config --type public
```


