# Admin-managed business event listings

Businesses and organizers request listings or corrections at **hello@summitscene.ca**. They send their business name, event title, date/times, town, venue/address, description, price, age/accessibility information, an official source or booking link, and image-use permission where applicable. Summit Scene admin reviews submissions and publishes/updates listings. Publication is not guaranteed. Booking remains with the organizer.

Public member accounts still support profiles, saved events, likes, Going, and notification preferences. No business signup or verified-business posting access is offered. Existing legacy account/event records are retained; this change does not delete or migrate them.

## Source changes

- Website home, business information, support, privacy, terms, safety, and listing guidelines now describe the contact-and-admin workflow.
- App Business Help, Account, signup routing, FAQ, and legal information direct businesses to the submission email.
- Only admin sees Manage or create/edit event routes and event management controls.
- The API reuses existing admin authorization for create/update/delete and management requests. Business-role registration is rejected; verified legacy business status no longer grants event publication rights.

## Release

1. Deploy the backend changes to Render. This is required to enforce admin-only writes; app copy alone is not authorization.
2. Deploy the website to the existing Netlify site. `netlify.toml` already builds with `npm run build:website` and publishes `.website-dist`. No Sites hosting or domain changes are needed.
3. Create a replacement iOS/Android app build containing these source changes. Previously built artifacts, including iOS build 38, do not gain these changes automatically.
4. Check that a guest or member can open Account → List an event / Business information and use its email link. Check the site's business page and home contact link.
5. Check admin event creation with the actual business/venue name, event details, official source, and booking link. Confirm member and legacy business credentials cannot create, edit, or delete events through the API.

Validation: isolated listing-access/member/Home tests and website tests passed (64 total), and the website build succeeded. Tests use stubs rather than modifying production data. App source syntax was also checked. No production deployment or replacement native build was performed for this change.
