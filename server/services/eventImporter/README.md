# Event importer maintenance

Run focused offline checks with `npm run test:event-importer` from the repository root. The tests use HTML fixtures and model stubs; they do not import into the live database.

## Deploying these changes

The updated admin client starts a background run with authenticated, admin-only
`POST /api/event-import/runs` (optional `sourceId` for a single-source retry), then
reads `GET /api/event-import/runs/current`. Deploy the backend before releasing
the updated app. Older installed clients retain their synchronous `/run` and
source retry endpoints and can still hit their existing 90-second timeout.

Run status and the completion summary are saved in the `EventImportRun` MongoDB
collection. A shared singleton slot prevents simultaneous background admin runs
across instances; pressing Run while one is active reconnects to it. Status
responses are not cached. The app polls for three minutes, then reports that the
run is still in progress rather than reporting a failed import. Press Run again
to reconnect while it remains active. Source failures are included in the summary.

The worker runs inside the backend process, so deploys, process termination or
free-service suspension can interrupt it. It does not automatically resume after
a restart. A run with no heartbeat for ten minutes is marked interrupted and can
be retried; already saved candidates and rejection history remain. Use an always-on
backend for reliable long runs. This is not an external durable job queue, and
standalone CLI imports should not be run concurrently with admin imports.

Deploy the backend for the importer fixes. The admin review checklist requires the updated client as well; deploy the backend before releasing that client so its bulk rejection endpoint is available. Ensure the `ImportCandidate` model's unique partial `identityKey` index is installed in MongoDB. Existing rows without that field remain valid, including older duplicate records. If production disables Mongoose automatic indexes, create the equivalent index through the normal database migration process:

```javascript
db.importcandidates.createIndex(
  { identityKey: 1 },
  { unique: true, partialFilterExpression: { identityKey: { $type: "string" } } }
)
```

Run the importer again through the admin screen. Rejected records are retained as suppression history, including matching occurrences imported from another source. A matching rejected listing also suppresses pending copies encountered on that run. Do not delete rejected records to clean up the queue: deleting them removes that history. Different dates/showtimes remain separate occurrences; the same rejected source detail URL continues to suppress that source listing if its details change.

Use the existing duplicate cleanup action for old pending records. It marks duplicates without deleting published events. Already published duplicate events need an admin review and removal of the unwanted copies; this importer does not delete live events automatically.

The review checklist supports selecting individual unpublished events or all loaded events (up to 100), then rejecting them in one batch. It retains rejection history, excludes published events, and reports selections that changed or disappeared before the request completed. Failed requests keep the client selection available for retry.

## Extraction and review

The importer reads structured JSON-LD graphs, referenced places, postal addresses, ISO timestamps and HTML microdata. It combines overlapping calendar representations and follows same-site detail links for missing venue/time facts. Existing reviewed venue, address and time values survive partial source responses. UTC event timestamps are converted to America/Edmonton; offset timestamps preserve the source's local clock.

Detail requests use the existing robots rules, rate limits, retries and timeouts. `EVENT_IMPORT_MAX_DETAIL_PAGES_PER_SOURCE` defaults to 40 additional detail pages per source per run. A detail failure leaves calendar facts intact. Missing venue/time values are flagged and excluded from bulk approval; they are never invented. Date-only/all-day listings also need manual review when no time is supplied. A capped batch does not mark unprocessed events as missing.

Duplicate checks use occurrence dates, normalized times, titles, towns, venues and canonical URLs, stripping common tracking parameters. Generic titles such as “Live Music” require the same venue. The approval endpoint checks again against published events. The unique occurrence index prevents concurrent insertions of the same source occurrence; fuzzy matches across different sources are review heuristics, not a database uniqueness guarantee.
