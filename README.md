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

- 22 selectable players; zoom, drag, player following and camera reset.
- Three seeded one-minute synthetic replays with continuous possession, interpolation, seek and 0.5/1/2/4x playback.
- Player/period filters; pass accuracy, progressive passes and pressure-related metrics computed on the server.
- Three visual layers; automatically detected pressure escapes with historical pitch evidence, player filtering, distinct fan/analyst views and light/dark themes.
- Explicit possession phases and a two-second confirmation delay; discoveries disappear when scrubbing before their confirmation.
- English by default, with a persistent English/German language selector for the full UI, analysis and accessibility labels.
- Guided analysis in German/English with clickable event evidence. Local calculated explanations cost nothing.
- Optional Azure model wording adapter, disabled by default. It is not yet a multi-step tool-calling agent.
- A single-container production build. No database, paid feed or cloud infrastructure is required to run locally.

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
- `frontend/src/lib/playback.ts`: shared clock, independent of React frames.
- `backend/app/data.py`: seeded event and tracking fixture.
- `backend/app/analysis.py`: metrics with strict replay-time cutoffs.
- `backend/app/ai.py`: deterministic explanation + opt-in Azure adapter.
- `docs/architecture.md`: decisions, performance targets and limitations.
- `docs/metrics.md`: metric definitions and synthetic data assumptions.

This is the foundation, not a completed hackathon submission. A broader scenario generator, multi-pass tactical detection, calibrated metrics, live streaming, structured AI validation and the final submission assets remain to be built. No licence has been selected yet.

