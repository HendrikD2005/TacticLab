# TacticLab

A football tactics workspace built for the Inside the Game hackathon. The first vertical slice combines an interactive Canvas pitch, a time-synchronised replay, real event-derived statistics and a server-side analysis assistant. All teams, players and data are synthetic.

## Run locally

Requires Node.js 24 LTS and Python 3.12/3.13. Run these commands from the repository root (the folder containing `package.json`). The checkout can live anywhere and have any folder name. On Windows:

```powershell
# Only for initial setup or dependency changes:
.\scripts\setup.ps1
npm run dev
```

If `python` is not on your PATH, pass `-Python` with your Python executable to the setup script. Open http://127.0.0.1:5173. Backend: http://127.0.0.1:8000; OpenAPI docs: http://127.0.0.1:8000/docs. Stop both servers with Ctrl+C. Restart the backend after Python edits (the small dev runner deliberately avoids a reload subprocess).

After moving a checkout, recreate `.venv` with your chosen Python interpreter and reinstall `backend/requirements.lock`; virtual environments contain machine-specific paths and are not portable. These generated files are excluded from Git. Application paths resolve relative to the repository, not to a fixed machine location.

Linux/macOS: create `.venv`, install `backend/requirements.lock`, run `npm ci` and `npm --prefix frontend ci`, then `npm run dev`.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, shadcn-style locally owned Button component with Radix Slot/CVA, Lucide, Canvas 2D + D3 Zoom, lazy-loaded Recharts, Python/FastAPI/Pydantic/NumPy, pytest, Playwright, Docker and GitHub Actions.

## Implemented

- Fluent-inspired navigation, command bar and consistent controls in light/dark themes.
- 22 selectable players; zoom, drag, player following and camera reset.
- Searchable event explorer with team, result, pressure and selected-player filters.
- Browser-local scene notebook with tactical notes and timestamped JSON report export.
- Five-second replay stepping and keyboard controls (Space, Left/Right outside inputs).
- Four seeded one-minute synthetic replays with continuous possession, interpolation, seek and 0.5/1/2/4x playback.
- Live simulation: 10 Hz tracking and completed events over SSE, a growing replay buffer, pause/rewind while receiving, reconnect and return to live.
- Player/period filters; pass accuracy, progressive passes and pressure-related metrics computed on the server.
- Three visual layers; automatically detected pressure escapes with historical pitch evidence, player filtering, distinct fan/analyst views and light/dark themes.
- Switch-of-play and sustained local-overload detection, with evidence, pattern filters and historical pitch markings.
- Explicit possession phases and a two-second confirmation delay; discoveries disappear when scrubbing before their confirmation.
- English by default, with a persistent English/German language selector for the full UI, analysis and accessibility labels.
- Guided analysis in German/English with clickable event evidence. Local calculated explanations cost nothing.
- Optional Azure model wording adapter, disabled by default. It is not yet a multi-step tool-calling agent.
- A single-container production build. No database, paid feed or cloud infrastructure is required to run locally.

## Live simulation and replay

Select **Live simulation** above the pitch. Each session releases a synthetic 60-second match excerpt at real-time speed. Positions and completed pass events arrive at 10 Hz; the timeline grows only as frames arrive. **Recorded replay** loads the complete fixture immediately.

Pause, seek or select a tactical finding to inspect received history while the stream continues. **Back to live** follows the newest received frames again at 1x. Replay speeds apply only to your view, never to the broadcaster. Connection recovery resumes after the last accepted frame without discarding your replay position. At completion, the full buffer remains available; **New simulation** starts a new session. Changing scenario or source starts a fresh workspace.

The live feed is a paced simulation of the seeded fixtures, not an external match feed. It requires no paid services. Sessions are held in one backend process, capped at 64 and expire after 10 minutes. A server restart expires live sessions; received browser data remains usable for replay and analysis. Reloading the page discards the browser buffer. Production scaling would need shared session state or sticky routing, plus deployment-level connection limits.

## Tactical patterns

Choose **Switches & overloads** (German: **Verlagerung & Überzahl**) in the scenario selector. In recorded replay, seek to **62:11** for the confirmed cross-field pass or **62:18** for the first confirmed **3 v 2**. The same findings arrive at those times in live simulation. Existing build-up scenarios retain their pressure-escape examples.

The **Tactical pattern** filter separates pressure escapes, switches and local overloads. Select a finding to pause at confirmation and show its explanation and evidence. Switches show historical pass endpoints; overloads show the receiving zone and counted players at confirmation. Fan mode summarizes the finding; analyst mode includes numerical evidence, explicit rules and limitations. Both languages, player focus, scene saving and JSON exports work with all kinds.

These are transparent geometric heuristics on synthetic tracking, not a trained scouting model. Switches currently cover a single successful pass; overloads are reception-triggered and need two seconds of locally controlled possession. See `docs/metrics.md` for thresholds and counterexamples.

## Analysis workspace

Use **Events** in the navigation to search player names or event IDs and filter by team, result or pressure. The list contains completed events up to your current replay time. Selecting a row pauses at that event, selects its player and returns to the pitch. Switching workspace sections preserves the Canvas camera and live stream.

**Save moment** pauses the view and opens a note for the current time/player. Saved scenes reopen their player and any selected tactical finding. Notes are stored in this browser per match/scenario, capped at 100 scenes with 1,000 characters each. They are not synced to GitHub or a server. If browser storage is unavailable, a notice explains that notes survive only in memory until reload. In a new live session, saved future scenes remain locked until their frames arrive.

**Export report** downloads JSON with the current analysis, completed events and saved notes up to the selected time. Future events/notes are excluded even when the full recorded fixture is loaded. Reports use schema version 1 and identify all data as synthetic; note text is exported as entered. Export is available when analysis for the current replay second is ready.

**Space** toggles playback and **Left/Right** seek five seconds; keyboard shortcuts leave text fields, buttons and native controls alone. Both shortcuts and toolbar steps respect the live buffer boundary.

## Optional Azure / Foundry

Copy `.env.example` to `.env`. Set the base URL of your Azure OpenAI v1 deployment, its key and deployment name. Only set `AI_ENABLED=true` when you want model calls. Keys never enter frontend code. The backend uses `/chat/completions`; your deployment must support this API and `max_completion_tokens`.

The adapter supplies calculated facts to the model, caps output at 450 tokens and limits requests per process to 20/hour by default. This is a development safeguard, NOT a billing cap or multi-instance rate limiter. It falls back to deterministic facts on timeout/failure. AI prose is not yet automatically fact-validated. Authentication, a shared quota and factual validation are required before opening paid AI to the public. No Azure resources or subscription have been created.

## Checks

```powershell
npm run check
.venv\Scripts\python.exe -m pytest
npm run test:e2e
```

Local browser tests use installed Microsoft Edge; CI installs Chromium. Test artifacts stay in `artifacts/`. npm and pip caches are configured under `.cache/` by the setup script.

## Production

```powershell
npm run build
.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
# Or, with Docker installed:
docker build -t tacticlab .
docker run --rm -p 8000:8000 tacticlab
```

FastAPI serves `frontend/dist` after a build. Azure Container Apps can run this image later; hosting is intentionally not provisioned. Never expose the development servers publicly.

## Project layout

- `frontend/src/components/Pitch.tsx`: imperative renderer and D3 camera.
- `frontend/src/lib/playback.ts`: view clock and received-data boundary, independent of React frames.
- `frontend/src/lib/live.ts`: resumable SSE client and fixed-capacity replay buffers.
- `backend/app/live.py`: paced synthetic broadcaster and bounded live sessions.
- `backend/app/data.py`: seeded event and tracking fixture.
- `backend/app/analysis.py`: metrics with strict replay-time cutoffs.
- `backend/app/ai.py`: deterministic explanation + opt-in Azure adapter.
- `docs/architecture.md`: decisions, performance targets and limitations.
- `docs/metrics.md`: metric definitions and synthetic data assumptions.

This is the foundation, not a completed hackathon submission. A broader scenario generator, multi-pass tactical detection, calibrated metrics, incremental detection for external feeds, structured AI validation and the final submission assets remain to be built. No licence has been selected yet.


### Replay-aware analysis assistant

The assistant accepts switches of play, local overloads, pressing, player passing and period comparisons in English or German. Quick actions use the selected player's team; player analysis uses the selected player. A full name or surname from the roster narrows free-text questions to that player. Ask one topic and one player at a time. Unsupported or multi-topic questions return a scope hint instead of a fabricated answer. This is deterministic intent routing, not a general-purpose football chatbot; no paid service is required.

Questions pause the replay at its exact position. Responses include the time, scope and up to six evidence cards (at most four tactical patterns). Tactical cards seek to the confirmation time and select the corresponding pitch overlay; ordinary event cards seek to the event and select its passer. Seeking, changing players or changing language invalidates pending answers, including sub-second seeks. Live requests retain the server's producer-time bound, and buffered replay still uses the viewed time.

Try the **Switches & overloads** fixture at **62:18**, then ask “Which switches did Theo Wolf play?” or “Welche Überzahl hatte Finn Roth?”. The switch opens at 62:11 and the overload at 62:18. No finding is disclosed before confirmation.
