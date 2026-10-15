# Architecture

The browser animates from typed numeric buffers. Canvas draws only when the clock, camera, layer, player or viewport changes. Player movement never causes individual React renders. React clock updates are capped at 10 Hz; statistics requests at one per replay second and player selection. Changes abort old HTTP requests; responses from another player or a future replay time are not shown. A small stale interval up to the previous second is labelled by its timestamp.

D3 owns camera transforms. Canvas caps pixel ratio at 2 for high-DPI displays. Positions are interpolated between 10 Hz samples. The single global replay time synchronises positions, events, metrics and explanations. All analytics use completed events with event time <= replay time. A browser receives the full small fixture for scrubbing; this is replay, not a secure live-data streaming implementation.

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

The API never returns insights confirmed after the requested replay time. The frontend additionally rejects responses later than its current clock and clears historical markings when their insight is no longer visible. An explicit scenario switch remounts the workspace, cancels old requests and resets the clock and local caches. The complete replay fixture remains available to the browser; these guarantees are presentation semantics, not access control for a live feed.

The timeline now contains calculated findings instead of annotated scenes. Selecting one pauses at confirmation time and draws a labelled historical pass trace with opponent evidence. Analyst mode includes numeric evidence and the detection rule; fan mode gives a concise explanation. Player-focus filtering narrows findings to those involving the selected passer or receiver. No animation frame waits for analysis or AI. Canvas receives a small overlay object and retains its existing renderer loop.

Next: incremental ingestion/live transport, richer multi-pass patterns, structured model tool use and multilingual recaps. No paid AI service is needed for the current detector.


## Validation of possession milestone

31 backend tests cover independent synthetic positive examples, mirrored attack direction, pressure/space/progression counterexamples, loss and regain, confirmation delay, timeline rewind, five generator seeds and index reuse. Four browser tests cover the existing workflow plus scene evidence, historical canvas marking, fan mode, player filtering and scenario isolation. TypeScript and production build pass.

A local 180-frame Edge sample with the insight overlay, pressure layer and zoom measured median 16.7 ms, p95 17.1 ms, with no frames above 33.4 ms. This short sample is not a cross-device guarantee. Screenshot inspection includes desktop dark/light and a 360 px mobile layout. Camera resize preserves the field point at the viewport centre.
