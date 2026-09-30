# Aditya | My personal Tracker: daily tracking and deployment

## What changed

The original Next.js 16.3.2 / React 19 / Tailwind application is retained. `/` remains the learning dashboard and `/courses`, lesson pages, favorites and progress remain available. The new entry point is `/today` (also the installed app start URL). Navigation links the two areas.

- `/today`: time-zone-aware checklist, category sections, manual completion, skips, per-occurrence rescheduling, history, one-off creation and past-date review.
- `/tasks`: edit title, category, link, notes, minutes, priority, inclusive start/end dates, daily/weekday/weekly/one-off recurrence and pause state. Six editable examples start paused, including three separately labelled inbox tasks. No email passwords are collected.
- `/study`: the existing nine courses / 72 lessons, explicitly separated into later, active and finished. All start in later; no daily study tasks are created implicitly. Save a current lesson/resource URL and progress note; create a routine from an active course. External course links can also be saved directly on tasks.
- `/insights`: daily counts, trailing 7/30-day summaries, six calendar weeks/months, category totals, scheduled-occurrence consistency, active courses and latest notes.
- `/settings`: time zone, configurable local reminder time (08:00 initially, disabled until enabled), install instructions, subscription/test controls and server scheduler status.

There is no AI dependency or existing AI integration. `TaskProposal` in `src/lib/daily-store.ts` is the extension boundary for a future optional assistant: proposed tasks must enter the editable form and require user approval before saving. An integration would need a provider, server-only API key, explicit cost limits, and privacy/approval UX. It must not write completion history or change schedules autonomously.

## Data and migration

The catalog and original links remain in `src/data/courses.ts`, unchanged. Persisted data remains in `.data/learning-hub.json`. A versioned `daily` property is added lazily on first access; original `lessons` and any other top-level fields are retained. No database, ORM, account migration or manual SQL migration is required. Back up this file before deployment; never commit it. `LEARNING_HUB_DATA_FILE` can point to an absolute path on persistent storage.

Every update, including the original lesson API, uses an exclusive filesystem lock and fsynced temporary file followed by atomic rename. This serializes processes sharing the same local filesystem. Corrupt JSON is an error, never a reason to replace your data with an empty store. If a process crashes leaving `learning-hub.json.lock`, stop all writers, back up and inspect the store, then remove only that stale lock before restarting. Do not remove locks from a live process. Local persistent storage is required; distributed network filesystems and horizontally replicated deployments are not supported by this store.

Task versions preserve prior schedules. Occurrences are unique by task ID and original scheduled date; materialization catches up missed dates on the next request or scheduler invocation. Edits affect current untouched occurrences and future days. Occurrences with recorded actions retain their task snapshot and history. Pausing does not erase past completion. To remove an already-acted-on occurrence from today's pending work, intentionally skip it. Creating a routine never backfills obligations before its creation date.

Rescheduling moves the same occurrence and records its original/destination dates; it does not change the recurrence. Moving a Monday occurrence to Tuesday when the routine also runs Tuesday creates two *distinct* obligations, shown separately with the moved date. A repeated reschedule request to the same destination is a no-op. Skips are explicit and count in the denominator, so completion is completed / actually scheduled. Rescheduled work counts only on its destination date. Off-days have no denominator and do not break a run; skipped or unfinished past scheduled occurrences do. Today remains open until midnight.

Calendar dates are computed with `Intl` in the configured IANA zone, initially `Asia/Kolkata`. Date arithmetic uses date-only UTC values rather than adding 24 hours to local midnight. Existing occurrence dates/time-zone snapshots remain unchanged when the configured zone changes. New dates follow the new zone; revisiting a date cannot create a duplicate occurrence.

The legacy auth token format is replaced by signed tokens with a 30-day server expiry and cookie lifetime. Existing sessions must sign in once again. Refresh no longer logs out. Handlers verify sessions themselves, write APIs check same-origin requests, and redirect destinations are restricted to the same origin. This remains a single-account app. Rotating the session secret revokes all signed sessions; per-device session revocation is not implemented.

## Hosting decision

The repository contained only a generic Next.js README, no confirmed deployment, scheduler or hosting credentials. Localhost is not a deployment and cannot deliver a verified iPhone experience over the internet. Do not deploy this file-backed application unchanged to ephemeral serverless storage.

The smallest compatible deployment is **one Node.js process on a VM/VPS or persistent-disk container**, behind an HTTPS reverse proxy, with an operating-system cron job (or systemd timer). Use the existing provider if it meets those requirements. Required deployment information: provider/runtime, HTTPS domain, persistent volume path, and a scheduler able to POST with a secret Authorization header. An external scheduler is also possible if it supports authenticated POST requests and your server is continuously reachable. No paid provider is required by the code or subscribed to automatically.

If the chosen host has no persistent disk, first choose a transactional persistent store and migrate the same logical records. An ephemeral JSON file is not a safe substitute. If it has no scheduler, use the VM's cron/systemd timer or a compatible external scheduler; setting push keys alone does not schedule reminders.

## Environment variables

Keep all values in the deployment's secret/environment settings or ignored `.env.local`.

| Variable | Purpose |
| --- | --- |
| `LEARNING_HUB_USERNAME` | Existing single-account login |
| `LEARNING_HUB_PASSWORD` | Existing account password; never an inbox password |
| `LEARNING_HUB_SESSION_SECRET` | Long random signing secret; rotation signs out all sessions |
| `LEARNING_HUB_DATA_FILE` | Optional absolute persistent JSON path; defaults to `.data/learning-hub.json` |
| `APP_ORIGIN` | Canonical HTTPS origin, e.g. `https://daily.example.com`, without trailing slash |
| `VAPID_PUBLIC_KEY` | Public application-server push key; returned to the signed-in browser |
| `VAPID_PRIVATE_KEY` | Secret VAPID private key, server only |
| `VAPID_SUBJECT` | Valid operator contact such as `mailto:you@example.com` |
| `CRON_SECRET` | At least 32 random bytes encoded as a secret string; job bearer token |
| `YOUTUBE_API_KEY` | Existing optional YouTube playlist-listing integration |

Generate push keys once with `node node_modules/web-push/src/cli.js generate-vapid-keys`. Store the output securely, outside Git. Changing the key pair requires reconnecting installed-device subscriptions. No push keys or scheduler secrets were generated or added to the repository in this implementation.

## Build and run

1. Back up the existing JSON data; retain `.env.local` outside the repository.
2. Install with `npm ci`, then run `npm test`, `npm run lint`, and `npm run build`.
3. Set the environment above and run `npm start` under your process supervisor. Keep the working directory stable or use `LEARNING_HUB_DATA_FILE`.
4. Configure HTTPS and same-origin proxy forwarding. Keep `.data` outside static/public hosting and accessible only to the application account. Back it up regularly.
5. Open `/today`, sign in, edit/unpause routines or add tasks, and choose active courses.

On this Windows machine the `npm` shim resolves incorrectly. Equivalent commands work with `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" …`, using `--cache .data/npm-cache` for install/exec. Direct checks: `node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts`, `node node_modules/eslint/bin/eslint.js .`, `node node_modules/next/dist/bin/next build`.

## Morning scheduler

Have a server-side cron job invoke the following command every five minutes. Put `APP_ORIGIN` and `CRON_SECRET` in the scheduler's protected environment, not a committed file. This command is an example for a Linux host:

```sh
curl --fail --silent --show-error --max-time 120 \
  -X POST -H "Authorization: Bearer ${CRON_SECRET}" \
  "${APP_ORIGIN}/api/jobs/morning"
```

Use cron expression `*/5 * * * *`. The server checks the configured local time and date on each call. UTC cron needs no seasonal time changes. A spring-forward missing time sends at the first later local time; a repeated fall-back hour is deduplicated. If the server is down at reminder time, the first successful later invocation that day can send it. Past dates are never sent as notification catch-up. Settings show the last successful configured scheduler contact; no contact means it is not verified.

The endpoint accepts POST and requires `CRON_SECRET` independently of browser cookies. Subscriptions require the signed-in account, are stored only for that owner, and are capped at ten devices. Only known HTTPS push-provider endpoint domains are accepted. Expired 404/410 subscriptions are removed. Reminder text contains a count, not task titles; tapping opens `/today` (and login if needed).

Deduplication is per device and local date, independent of configured reminder time/zone name. A durable claim is written **before** sending, and repeated jobs cannot send another attempt for the same key. Delivery is intentionally at-most-once: an interrupted request or ambiguous provider failure may miss a reminder and is not retried that day. This avoids duplicate reminders but is not an exactly-once delivery guarantee. Browser notification tags also collapse duplicate presentations. A successful provider response means accepted, not proof the iPhone displayed it.

## Install and test on iPhone

1. On iOS 16.4 or later, open the deployed HTTPS origin in Safari.
2. Share → Add to Home Screen. Open Aditya | My personal Tracker from that icon and sign in.
3. In Settings, choose time zone and reminder time, then save with reminders enabled.
4. Tap Enable notifications and approve the user-triggered system prompt.
5. Tap Send test notification and confirm it appears on the device and opens Today. Permission prompts are never automatic.
6. Configure the scheduler. Close the app, set a near-future reminder time for testing, and confirm a real scheduled notification arrives. Invoke the job again that date and verify no duplicate. Restore your preferred morning time afterward.

If permission is denied or Web Push is unavailable, all checklist and course features continue to work. No email digest or paid notification service was added. Support requirements were checked against [WebKit's iPhone Web Push documentation](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) and the [web-push library](https://github.com/web-push-libs/web-push).

## Verification and remaining limits

- All 13 automated tests pass, covering recurrence modes, start/end dates, pauses, IST midnight, DST transitions, leap days, catch-up and history, schedule versioning, rescheduling, skipped denominators, off-day consistency, time-zone travel, simultaneous scheduler claims, unsafe inputs and concurrent store writes preserving existing keys.
- TypeScript, ESLint and production build pass. Authenticated production route and PWA asset checks pass; unauthenticated APIs/job requests and cross-origin writes are rejected. Browser checks verified one-off creation/completion and persistence after reload. Runtime API checks verified skip, undo, reschedule and retry behavior. All five new views were inspected at a 390px viewport without horizontal overflow. Temporary QA records were removed afterward.
- The PWA caches only a generic offline page, never private pages or API data. An already-open view remains readable offline; saving is disabled and no offline writes are queued. Cold offline navigation displays reconnect instructions.
- No deployed HTTPS origin, VAPID credentials, scheduler, or real iPhone subscription was available. **Actual push delivery is not verified.** The UI reports this setup state instead of claiming reminders are running.
- Existing course catalog remains code-managed. Favorite toggling and the original library's search/profile placeholders remain outside this change. YouTube playlist listing still requires the missing API key. Native-device Safari testing remains necessary after deployment.
- The existing login endpoint still needs deployment-level brute-force throttling (for example at the reverse proxy) before public internet exposure. Single-account signed tokens have no individual revocation list; rotating the signing secret invalidates all sessions.
- `npm audit --omit=dev` reports nine dependency findings (one critical, five high, three moderate) in the installed dependency tree. These are not silently resolved by a framework/stack upgrade in this feature change; review and patch them before internet deployment. The passing application checks are not a security certification.
