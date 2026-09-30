# Learning tracker knowledgebase

Reviewed 2026-09-30. This document describes the local source and verified behavior; it contains no credentials.

Update: the daily-tracker extension is documented in [DAILY-TRACKER.md](DAILY-TRACKER.md), which supersedes the original authentication/storage behavior below. It adds `/today`, `/tasks`, `/study`, `/insights`, `/settings`, additive daily data in the same store, atomic locked writes, expiring sessions, per-handler authorization, and PWA/push infrastructure. The earlier audit remains a historical baseline.

## Architecture

- Private single-user Next.js 16.3.2 App Router application, React 19.2.8, React Compiler, Tailwind v4 and Base UI.
- `src/data/courses.ts` owns the course/section/lesson catalog and video source definitions: 9 courses and 72 lessons in the current checkout (the supplied handoff said 10 courses). Sources include individual YouTube videos, YouTube playlists and Google Drive resources.
- Dashboard `/`, catalog `/courses` (category query filter), details `/courses/[courseId]`, player `/watch/[lessonId]`, `/favorites`, `/progress`, and `/login`.
- Server pages call `readProgressStore()` and `applyProgress()` to derive completion counts and percentages. The reader now calls `connection()` before filesystem access, so all six progress-dependent page routes render on demand.
- `src/lib/progress-store.ts` persists lesson completion, position, optional playlist index and timestamp to `.data/learning-hub.json`, relative to the process working directory. There is no database. Deployment needs persistent writable disk; multiple processes are currently unsafe writers.
- `GET /api/progress` reads progress; `POST /api/progress` updates a known lesson. `LessonNavigation` toggles completion. `PlaylistPlayer` saves playlist index to localStorage and the server.
- YouTube single videos use privacy-enhanced embeds; playlists use the iframe API and `/api/youtube/playlist`, which calls YouTube Data API with a one-hour fetch revalidation interval.
- Favorites are catalog flags, not editable persistent state. Header search and profile are currently presentation-only controls.

## Authentication and configuration

- `.env.local` configures `LEARNING_HUB_USERNAME`, `LEARNING_HUB_PASSWORD`, and `LEARNING_HUB_SESSION_SECRET`; never print or commit values.
- `YOUTUBE_API_KEY` is needed for playlist listings and is currently absent.
- Login validates credentials and sets an HttpOnly, SameSite=Lax cookie (Secure in production). The token is a fixed payload signed with HMAC and has no embedded expiry.
- `src/proxy.ts` is the active request gate, adjacent to `src/app`. The existing staged move from the root is required and was preserved.
- API handlers do not independently verify the session. Logout deletes the browser cookie, but cannot revoke a copied token.

## Running and validating

- Existing development site: http://localhost:3000 (opened in the app browser).
- Production audit server started on http://localhost:3217. Ports 3100 and 3200 were not stopped or repurposed.
- The current `npm` command resolves to a broken global installation. Direct equivalent commands work:
  - `node node_modules/next/dist/bin/next dev`
  - `node node_modules/next/dist/bin/next build`
  - `node node_modules/next/dist/bin/next start --port 3217`
  - `node node_modules/eslint/bin/eslint.js .`
- Build and its TypeScript check passed; ESLint passed. Build output marks the six progress-dependent routes dynamic.
- A production API write changed the lesson HTML from `Mark as complete` to `Completed`. Original progress file bytes were restored afterward.
- Read the bundled Next.js documentation under `node_modules/next/dist/docs/` before framework changes, as required by AGENTS.md.

See `AUDIT-2026-09-30.md` for remaining defects and verification limits.
