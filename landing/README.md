# Summit Scene Landing Page

This folder is a standalone static landing page. It does not affect the Expo
mobile app.

Open `index.html` in a browser to preview it locally.

The refreshed homepage focuses on event discovery without a browsing account.
`events-refresh.css` scopes the homepage design so existing support and legal
pages retain their layout. `navigation.js` provides the accessible mobile menu;
navigation remains visible if JavaScript is unavailable. The event preview is
illustrative and does not fetch or advertise live listings. Android remains
labelled coming soon until the production release is available.

Netlify already publishes this `landing` directory through the repository's
`netlify.toml`. Deploy the updated source through the existing Netlify workflow
to make it live; no Sites project or hosting migration is needed. Retain the
verification, recovery, deletion, and legal routes used by older app versions.

When ready, this folder can be deployed to a static host such as Netlify,
Vercel, Cloudflare Pages, or GitHub Pages.

The `_redirects` file exposes clean App Store review URLs:

- `https://summitscene.ca/privacy`
- `https://summitscene.ca/terms`
- `https://summitscene.ca/delete-account`
- `https://summitscene.ca/support`
- `https://summitscene.ca/safety`
- `https://summitscene.ca/community-guidelines`
- `https://summitscene.ca/business`
