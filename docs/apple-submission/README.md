# Summit Scene Apple Submission Notes

Last updated: June 8, 2026

## App Information

- App name: Summit Scene
- iOS bundle identifier: `com.rachellauren.summitscene`
- Privacy Policy URL: `https://summitscene.ca/privacy`
- Terms URL: `https://summitscene.ca/terms`
- Account deletion URL: `https://summitscene.ca/delete-account`
- Support URL: `https://summitscene.ca/support`

## App Review Accounts

Use real production accounts for resubmission review. Do not seed fake local members, fake organizers, or App Review demo users into production.

Use `admin@summitscene.ca` as the main internal admin account. Do not provide this account to App Review unless Apple specifically asks for admin/moderation access.

No special equipment is required. A standard iPhone or iPad with internet access is enough. Location permission is optional because reviewers can browse by town, and photo library permission is only needed when choosing profile or event photos.

## Review Notes to Paste in App Store Connect

Summit Scene is a local events, tour discovery, and community app for Banff, Canmore, Lake Louise, and nearby areas.

Sign in options:

- Email/password
- Sign in with Apple on iOS
- Google Sign-In on Android when the Android build is configured with Firebase/Google OAuth

Review credentials:

- Provide a real reviewer account in App Store Connect if Apple requires login credentials.
- Do not provide admin credentials unless Apple specifically asks for moderation/admin access.

No special equipment is required. The app can be reviewed on a standard iPhone or iPad with internet access. Location sharing is optional; reviewers can browse by town without granting location permission.

Account deletion:

- In app: Account > Delete Account
- Public instructions: `https://summitscene.ca/delete-account`

User generated content and safety:

- Users can post community content, buddy/plan posts, replies, comment replies, and likes.
- Users can report fake events, scams, inappropriate content, misleading businesses, profiles, posts, replies, events, and tours.
- Users can block other users.
- Summit Scene uses server-side content filtering and an admin moderation queue for reported content/users.

Organizer and tour content:

- Business/tour organizers must provide business name, contact email, town, category, short description, and at least one proof link such as a website, Instagram page, Facebook page, or Google Business listing.
- Organizer verification is manual at first.
- Verified organizers may show a Verified Local Organizer label.
- New or unreviewed organizers may show a New Organizer label.
- Tours and paid activities may link to external booking websites. Purchases, payments, cancellations, refunds, and booking support are handled outside Summit Scene by the organizer or third-party provider.

## Required Backend Environment

- `EXPO_PUBLIC_API_BASE_URL` in the app must point to the production API.
- `APPLE_BUNDLE_ID` on the backend should be set to `com.rachellauren.summitscene`.
- `GOOGLE_WEB_CLIENT_ID` on the backend should match the Google web OAuth client ID used by the Android app.
- Email delivery can stay disabled while testing if resend usage must be avoided.

## App Privacy Details Checklist

Use the final App Store Connect answers that match the production build and enabled services. Current app behavior includes:

- Contact info: email address, optional public business phone number.
- User content: profile details, event/tour listings, event photos, community posts, replies, likes, groups, reports, and organizer information.
- Location: optional device location for nearby discovery, plus event and meeting locations entered by users.
- Identifiers: internal user/account identifiers and authentication tokens.
- Diagnostics/support: app errors, request logs, support emails, and moderation records.
- Not tracking: do not mark data as tracking unless a future analytics, ads, or third-party SDK is added that tracks users across apps or websites.

## Manual Apple Developer Tasks

- Enable the Sign in with Apple capability for the iOS app identifier.
- Confirm the production build includes the Sign in with Apple entitlement.
- Confirm `https://summitscene.ca/privacy`, `/terms`, `/delete-account`, `/support`, `/safety`, `/community-guidelines`, and `/business` resolve on the public site.
- Confirm account deletion works in the installed production build.
- Confirm the app does not expose development/debug text in production.

