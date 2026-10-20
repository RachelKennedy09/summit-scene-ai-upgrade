# Summit Scene Landing Page

This folder contains Summit Scene's static marketing, legal and support pages,
plus the stylesheet used by the public events website.

Open `index.html` in a browser to preview it locally.

The refreshed homepage focuses on event discovery without a browsing account.
`events-refresh.css` scopes the homepage design so existing support and legal
pages retain their layout. `navigation.js` provides the accessible mobile menu;
navigation remains visible if JavaScript is unavailable. The event preview is
illustrative and does not fetch or advertise live listings. Android remains
labelled coming soon until the production release is available.

Netlify now runs `npm run build:website` and publishes `.website-dist` through
the repository's `netlify.toml`. The build copies these pages, adds canonical
metadata and auth-page noindex directives, and generates robots/domain
association files. Live event pages render through `netlify/functions/events.mjs`
using the shared backend's public event API. The domain and existing hosting
project stay unchanged. Retain the verification, recovery, deletion and legal
routes used by older app versions.

For local review, run `npm run build:website`, then
`npm run preview:website -- --fixture`. The local preview explicitly labels
sample data. Production requires the backend and Netlify Function; uploading
only this static folder won't provide event browsing.

See [the events website release guide](../docs/events-website.md) for the
environment variables, backend-first deployment order, mobile link setup,
testing and Google Search Console steps. Nothing is deployed by the build.

The `_redirects` file exposes clean App Store review URLs:

- `https://summitscene.ca/privacy`
- `https://summitscene.ca/terms`
- `https://summitscene.ca/delete-account`
- `https://summitscene.ca/support`
- `https://summitscene.ca/safety`
- `https://summitscene.ca/community-guidelines`
- `https://summitscene.ca/business`
