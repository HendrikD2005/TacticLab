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

The baseline is preserved in commit ffecba1. Work continues on `codex/realistic-tempo-ui`. The frame clock still represents actual seconds at 1x; the fixture itself now contains active movement and distance-dependent passes. A central button system replaces competing generic button overrides. Pitch markers, match chrome, inspector and sequence rows use a restrained analysis-workspace hierarchy.
