# Offline evaluation

Run from the repository root:

```powershell
.venv\Scripts\python.exe scripts\evaluate.py
```

No server, browser, login, model request or cloud resource is required. The script
forces AI off, writes `artifacts/evaluation.json`, and exits with code 1 if a
label, routing expectation or grounding check fails. CI runs the same command.
An optional `--output PATH` changes the JSON destination.

## What is measured

- **18 hand-labelled geometric cases** in `evals/scenarios.py`, constructed
  independently of the application's seeded replays. They cover switches and
  overloads, both attack directions, delayed confirmation, exact width/space/
  backwards-pass thresholds, same-flank movement, equal numbers, absent defenders
  and a transient numerical advantage. Labels are authored explicitly; the detector
  does not generate its own expected results.
- **16 English/German routing cases** in `evals/questions.json`, covering supported
  questions, named-player and team scope, ambiguous topics, unknown players,
  hat tricks, goals, xG and predictions.
- **64 local short reports** across all four application replays, four cutoffs,
  two languages and two detail modes. Checks count future timestamps, unknown
  evidence IDs and selected tactical claims with no navigable scene.
- **Future-tracking mutation** after 18 seconds in each application replay.
  It must not change the report at 18 seconds.
- **Local detector timing** includes index construction and one snapshot per
  geometric case. These short local timings are machine-dependent.

The JSON contains a detection confusion matrix, precision/recall on these
synthetic cases, routing successes and grounding violation counts. Keep case IDs
and failures when comparing revisions. These examples are regression fixtures,
not a held-out real-match benchmark. Perfect results here do not establish real
football accuracy, recall over unseen tactical situations, or model usefulness.

## What is deliberately separate

The backend suite tests the Foundry HTTP protocol with simulated responses,
including fabricated claim IDs, invalid tool arguments, quotas, timeouts,
refusals and evidence selection. The browser suite tests the actual UI and local
live transport. Both can be run without cloud credentials.

`foundry_live_verified`, `cloud_latency_ms` and `model_cost` remain false/null in
this offline report. Only the explicit [Foundry live smoke test](foundry.md)
can establish that the chosen deployment works. Model editorial usefulness and
cost require evaluation with that real deployment and human review; this script
does not manufacture those measurements.

When adding a detector, add positive and negative geometric cases and explicit
labels before changing this evaluation's scope. Real match data and expert labels
are needed for a meaningful accuracy claim beyond the synthetic demo.


## Recorded local result, 2026-10-20

The initial run passed all 18 geometric cases (7 positive, 11 negative),
all 16 routing cases, and all 64 report checks. It found zero future-evidence
leaks, unknown event references, missing selected tactical scenes or changes
caused by later tracking. Local index-plus-snapshot timing was 0.055 ms median
and 0.176 ms p95. These numbers describe this small synthetic regression set
on the development machine. They do not measure cloud latency or model quality.
