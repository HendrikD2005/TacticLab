# Synthetic data

Three 60-second fixtures are generated at backend startup by `backend/app/data.py`: `standard` (seed 42), `variation` (2026), and `control` (7). Each has 601 tracking frames at 10 Hz, 22 fictional players and 17 passes. No external data download is required.

The ball follows its owner between passes. A failed pass transfers control to its opponent receiver. Linking passes connect the previous independent sequences; there are no unrecorded ball transitions. Initial possession is explicit metadata. Runtime checks reject overlapping flights and passing by a non-owner.

`/api/match?scenario=standard` exposes the fixture, while `/api/analysis?scenario=standard&at=9&player_id=7` exposes only information confirmed by that replay time. Match data is delivered in full for replay, not live streaming. Scenario labels never drive the detector. The three fixtures currently produce one, two and zero confirmed pressure escapes respectively.

Tracking movement is still seeded support movement, not a full reactive football simulator. Pass targets and completion times remain authored; the tactical findings are calculated from their geometry and possession, rather than authored. See `docs/metrics.md` for exact rules and limitations.
