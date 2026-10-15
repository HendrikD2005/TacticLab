# Architecture

The browser animates from typed numeric buffers. Canvas draws only when the clock, camera, layer, player or viewport changes. Player movement never causes individual React renders. React clock updates are capped at 10 Hz; statistics requests at one per replay second and player selection. Changes abort old HTTP requests; responses from another player or a future replay time are not shown. A small stale interval up to the previous second is labelled by its timestamp.

D3 owns camera transforms. Canvas caps pixel ratio at 2 for high-DPI displays. Positions are interpolated between 10 Hz samples. The single global replay time synchronises positions, events, metrics and explanations. All analytics use completed events with event time <= replay time. Recorded replay receives the full fixture for scrubbing. Live simulation bootstraps only frame zero and receives subsequent frames over SSE, paced by the server clock.

Recharts is lazy-loaded in analyst mode. Animation does not await chart code, API responses or AI calls. The initial fixture is converted once to Float32Array buffers. For much larger matches, add chunked loading and a worker based on profiling; they are unnecessary infrastructure for this 60-second fixture.

Targets (not yet benchmark-certified): 60 FPS on a normal laptop, local controls <100 ms, no playback stall due to AI. Browser checks cover interactions; they do not prove sustained frame-time targets. Profile with overlays and high zoom before expanding the dataset.

Dev: Vite proxies /api to FastAPI; no permissive CORS. Production: Vite assets served by FastAPI, same-origin. Docker includes frontend build and backend. Data and derived state are reproducible, so no database is needed at this stage.

AI is explicitly opt-in; all keys stay server-side. The first adapter is grounded generation from preselected analysis functions, not autonomous tool use. Next steps: validated structured claims, actual tool-calling orchestration, bounded shared cache and request quota, deployment-level authentication. The local API is not an internet-hardened service.

## Initial local frame sample

On 2026-10-15, a headless Edge sample of 180 animation frames with playback, pressure overlays and zoom measured median 16.7 ms, p95 17.5 ms and no frames above 33.4 ms. This is a short development-machine sample, not cross-device performance certification. Reproduce with `node scripts/preview-check.mjs` while the dev server runs. Results live in ignored `artifacts/`.

## Verification on 2026-10-15

- TypeScript and Vite production build: passed.
- pytest: 9 tests passed (one upstream Starlette/httpx deprecation warning).
- Playwright: 2 browser tests passed, including a 360 px viewport.
- Built frontend served by FastAPI on a separate port: verified, including lazy chart and API.
- Dockerfile: prepared; image build not verified because the Docker Desktop Linux daemon was not running.
- Azure model: not exercised; no credentials were configured and no paid calls were made.


## Tempo and interface revision

The baseline is preserved in commit 80451aa. Work continues on `codex/realistic-tempo-ui`. The frame clock still represents actual seconds at 1x; the fixture itself now contains active movement and distance-dependent passes. A central button system replaces competing generic button overrides. Pitch markers, match chrome, inspector and sequence rows use a restrained analysis-workspace hierarchy.


## Possession intelligence and tactical UI

Each of the three seeded matches owns one `MatchIntelligence` index, built at process startup. It validates the ownership chain, indexes release/reception state transitions and derives confirmed single-pass pressure escapes from tracking geometry. Requests use binary search over timestamps; the detection work does not run once per player, browser frame or analysis request. The explanation adapter reuses the same index. Team metrics and comparisons use the selected player's team.

The API never returns insights confirmed after the requested replay time. The frontend additionally rejects responses later than its current clock and clears historical markings when their insight is no longer visible. An explicit scenario switch remounts the workspace, cancels old requests and resets the clock and local caches. Recorded mode still exposes the full fixture. Live requests additionally enforce the session's server-time boundary. The public local replay endpoint remains available; this is a simulation rather than access control for a confidential external feed.

The timeline now contains calculated findings instead of annotated scenes. Selecting one pauses at confirmation time and draws a labelled historical pass trace with opponent evidence. Analyst mode includes numeric evidence and the detection rule; fan mode gives a concise explanation. Player-focus filtering narrows findings to those involving the selected passer or receiver. No animation frame waits for analysis or AI. Canvas receives a small overlay object and retains its existing renderer loop.

Next: incremental detection for external feeds, richer multi-pass patterns, structured model tool use and multilingual recaps. No paid AI service is needed for the current detector.


## Validation of possession milestone

31 backend tests cover independent synthetic positive examples, mirrored attack direction, pressure/space/progression counterexamples, loss and regain, confirmation delay, timeline rewind, five generator seeds and index reuse. Four browser tests cover the existing workflow plus scene evidence, historical canvas marking, fan mode, player filtering and scenario isolation. TypeScript and production build pass.

A local 180-frame Edge sample with the insight overlay, pressure layer and zoom measured median 16.7 ms, p95 17.1 ms, with no frames above 33.4 ms. This short sample is not a cross-device guarantee. Screenshot inspection includes desktop dark/light and a 360 px mobile layout. Camera resize preserves the field point at the viewport centre.


## Internationalization

English is the default independently of browser language. The header selector supports English and German; valid preferences persist under `tl-language` in local storage. Invalid or unavailable storage falls back to English without preventing language changes. The provider lives above the scenario workspace, so changing language does not recreate the playback clock or Canvas camera. It updates the document language, title and description as well as visible and accessible labels.

Frontend catalogs live in `frontend/src/i18n/en.json` and `de.json`. Their keys are checked by TypeScript; browser tests check catalog parity, plural forms and interpolation arguments. `useI18n` supplies translation, memoized `Intl.NumberFormat` and plural selection. Canvas labels are formatted outside the frame loop, and chart rows are memoized. Proper names and source event IDs are not translated.

Backend text catalogs live in `backend/app/locales/`. Detection indices contain language-neutral evidence. `/api/analysis` accepts `language=en|de`; `/api/explain` takes the same field in its JSON body. Both default to English. Localization copies visible findings rather than mutating the shared index. Responses include their language; the client rejects stale responses after a language switch, aborts pending explanations and keys explanation caches by language. Player roles use stable codes. API notices and deterministic fallback explanations use the requested language without model calls.

To add a language, extend the language unions, picker and catalogs in both layers, then run catalog parity and end-to-end tests. Initial scope is intentionally English/German; no runtime translation service or new dependency is required.


## Live transport and replay buffer

`POST /api/live` takes a scenario and optional UUID session ID. Repeating the same ID/scenario is idempotent, including React StrictMode bootstrap; an ID cannot switch scenarios. The response contains match/player metadata, initial positions and no future tracking or events.

`GET /api/live/{session_id}/events?after=N` is a same-origin Server-Sent Events stream. Each `frame` has a monotonically increasing SSE `id` and JSON `{index,time,positions,ball,events}`. Times are match-relative seconds; only events completed by that frame are included. Frame zero is the bootstrap; streaming starts at one. `Last-Event-ID` takes precedence over `after` for native reconnects. Invalid/future cursors are rejected. The client closes and reconnects from its last successfully applied index if a packet is malformed or missing; duplicates are ignored. `complete` closes the connection after the final frame; `expired` tells the client to stop retrying an unknown/expired session.

The backend pre-encodes each of the three fixed fixtures once. A monotonic clock releases frames at 1x independently of every viewer. Catch-up yields cached packets in order and cooperatively yields between batches. There is no per-viewer producer queue. Session state is protected across FastAPI worker threads, capped at 64 entries and expires after 600 seconds. Session state is process-local: run one worker for this demo. An SSE-capable reverse proxy must avoid response buffering and allow long-lived requests; the endpoint supplies `Cache-Control: no-cache, no-transform` and `X-Accel-Buffering: no`.

The browser preallocates Float32Array storage for the declared duration and player count (about 108 KiB for tracking and ball in a 601-frame match). Accepted frames fill those arrays in place; only received timestamps and deduplicated events are appended. The original nested positions/ball arrays are bootstrap data only. The renderer uses the numeric arrays and never reads beyond received timestamps. Catch-up packets do not copy accumulated history, and feed/clock notifications are throttled to 10 Hz during continuous updates. Terminal and user-control changes notify immediately.

The view clock is separate from the source clock. Live following uses a small interpolation delay, with a hard received-frame boundary. Pause/seek changes only the view; receiving continues. Catching up in replay stops at the current buffer edge rather than extrapolating future movement. Return-to-live resets playback to 1x near the received edge. Offline/online events, native EventSource retry and a five-second silence watchdog recover broken or stalled connections. Scenario/source changes close the old stream, abort requests and dispose timers. Language changes preserve the session and camera.

Analysis/explanation requests in an active session are bounded by both the selected replay time and the server's available time. Detection remains the existing precomputed fixture index with timestamp cutoffs, not an incremental detector for unknown future input. The client rejects mismatched session/scenario/player/language responses. On completion or expiry, buffered history uses the recorded analysis index at the locally bounded replay time, so analysis remains usable without a live session. Refreshing the page starts over; buffers are not persisted.

Protocol references: [FastAPI StreamingResponse](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse), [MDN Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).

## Live milestone verification

49 backend tests and 14 Playwright tests pass, with TypeScript and the production build passing. Coverage includes paced release, no future bootstrap/analysis, resume cursors, duplicate/gap handling, capacity/expiry, replay clock bounds, real reconnect, scenario/language isolation, and completion/expiry with retained replay analysis. The browser suite includes a 360 px viewport. `node scripts/live-check.mjs` additionally checks a complete 60-second broadcast, records a 180-frame live sample with pressure overlays/zoom, and saves dark/light/mobile screenshots under ignored `artifacts/`.

The local live sample on 2026-10-15 measured median 16.7 ms, p95 17.2 ms and no frames above 33.4 ms out of 180. This short headless Edge sample is not a sustained or cross-device guarantee.


## Fluent-inspired analysis workspace

The application shell uses Segoe's native system font stack, neutral solid surfaces, a consistent 32 px button family, a blue primary action, persistent navigation and a compact command bar. Light/dark colors are semantic variables in `frontend/src/fluent.css`; football remains green on Canvas. Responsive layouts replace the desktop side navigation with a horizontal navigation bar. No new UI framework, web font service or paid dependency was added. Inspiration: [Microsoft Fluent typography](https://fluent2.microsoft.design/typography) and [design principles](https://fluent2.microsoft.design/design-principles).

The event explorer is memoized and computes filters on replay-second/event-count/filter changes, not animation frames. Search covers passer, receiver and source event ID. Clicking an event seeks to its completed timestamp. Navigation changes only the lower analysis panel; the existing Canvas and LiveFeed stay mounted. Historical insight overlays retain their original meaning.

The notebook uses `tl-scenes:v1:<match-id>:<scenario>` in local storage. Read validation rejects malformed JSON, duplicate IDs, invalid players/times and overlong notes. Writes occur on explicit save/delete, never on playback ticks. A storage failure leaves the current in-memory notebook usable with a visible notice. Saved scenes reference timestamps, players and optional insight IDs; they do not copy tracking buffers. New live sessions lock scenes beyond their received boundary and hide their note text until available. This is local browsing state, not shared collaboration or durable server storage.

Report generation is an explicit client-side operation. It clamps the export time to received data and match duration, excludes later events/notes, and includes only compatible analysis at or before that cutoff. The UI enables export once the requested replay second's analysis is available. JSON includes schema version 1, synthetic-data attribution, scenario, language, player roster and timestamps. No backend call, tracking-array copy or cloud upload is needed to export. Downloads are local and temporary object URLs are revoked.

Validation: TypeScript/production build, 49 backend tests and 20 Playwright tests pass. New checks cover search/filter/seek, camera identity, scene persistence and scenario isolation, locked future scenes during live reception, report cutoffs, unavailable/malformed storage, editing-safe shortcuts and responsive English/German layouts. Screenshot workflow: `node scripts/workspace-check.mjs`; existing replay/live performance scripts remain available. A standalone local replay sample with pressure overlay and zoom measured 8.3 ms median, 9.0 ms p95, with no frames above 33.4 ms out of 180; display refresh and machine load affect these short samples.

The full 60-second live broadcast also passed after the workspace changes, retaining the paused scene and all 17 events. Its separate 180-frame live sample measured median 8.3 ms, p95 8.5 ms and no frames above 33.4 ms.
