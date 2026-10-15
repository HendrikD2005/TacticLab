# Synthetic data

The default fixture is generated on backend startup by `backend/app/data.py`, with seed 42. It includes 601 position frames, 22 fictional players, 14 pass events and four annotated sequences. `/api/match` exposes the validated data. No external data download is required. See `docs/metrics.md` for the explicit limitations.

