# TacticLab demo and submission kit

This document separates implemented work from the external steps still needed
before submission.

## Review the application locally

Use the repository's `main` branch for the release, or `dev` for ongoing integration,
and follow the setup commands in [README](../README.md).
No Azure account is required for the default local mode.

1. Open the application in a fresh browser.
2. Click **Show tactical example**. The recorded fixture opens at 62:18 with
   Theo Wolf selected, a marked cross-field pass and a short team report.
3. Open the **62:11 · Switch of play** evidence link. The clock and marking follow
   the exact confirmation time. Seek back to 62:10: the unconfirmed switch disappears.
4. Seek to 62:18 and ask **Which switches did Theo Wolf play?**
5. Switch between Analyst/Fan and English/German. Open the overload evidence and
   download the short text report or full JSON report.
6. Select Live simulation. Wait for a finding, pause and rewind while incoming
   data continues, then return to live.
7. Ask **Did Theo Wolf score a hat trick?** The application explains its supported
   scope instead of substituting pass statistics.

Foundry is intentionally unconfigured. When credentials become available, follow
[foundry.md](foundry.md), run its explicit live smoke test and repeat steps 4–5.
Open **How this answer was built** to show actual tools, tokens and duration.
Do not present offline protocol tests or a local fallback as a successful cloud run.

## Reproducible checks

```powershell
npm run check
.venv\Scripts\python.exe -m pytest
.venv\Scripts\python.exe scripts\evaluate.py
npm run test:e2e
```

The evaluation writes `artifacts/evaluation.json`: hand-labelled geometric
counterexamples, bilingual question-routing expectations, report evidence
cutoffs and a future-tracking mutation check. See [evaluation.md](evaluation.md)
for interpretation. Test artifacts are local and ignored by Git.

## Suggested 110-second recording

| Time | Show | Explain |
| --- | --- | --- |
| 0–12 s | Tactical example, pitch and short report together | A useful match explanation should be traceable to the observed scene. |
| 12–32 s | Switch evidence, rewind before confirmation | Findings depend on completed events and observed possession. |
| 32–55 s | A supported question, tool trace | Show the real Foundry run after configuring it; otherwise identify this as local mode. |
| 55–75 s | Fan/Analyst and language switch | The same evidence supports a compact fan brief and detailed geometric explanation. |
| 75–95 s | Live buffer and report download | Pause incoming action, revisit a scene, export only the viewed history. |
| 95–110 s | Architecture and evaluation results | React/Canvas, FastAPI, optional Microsoft Foundry, bounded claims and explicit limitations. |

## External submission checklist

- [ ] Confirm registration and team details in the
  [official event portal](https://innovationstudio.microsoft.com/hackathons/insidethegamedeveloperhackathon).
- [ ] Recheck the current
  [official rules](https://github.com/microsoft/insidethegamehackathon/blob/main/OFFICIAL%20RULES.md)
  and required submission fields.
- [ ] Configure the chosen Foundry deployment and retain a successful real
  smoke result, deployment identifier, latency and token usage.
- [ ] Record deployment-specific token prices and estimate cost from actual usage:
  input tokens × input price / 1,000,000 + output tokens × output price / 1,000,000.
  Prices and live latency are currently **unmeasured**, not zero.
- [ ] Choose demo hosting/access and test it in a fresh browser outside the
  development machine. Public hosting was not provisioned by this change.
- [ ] Confirm reviewer access to the repository and record the submitted `main`
  commit so the review can be reproduced independently of later development.
- [ ] Select the intended project licence.
- [ ] Record the video, choose its final URL and verify access without the author's login.
- [ ] Submit the project and retain the portal's submission confirmation.

| Submission field | Current value |
| --- | --- |
| Project | TacticLab |
| Repository | `https://github.com/HendrikD2005/TacticLab` — reviewer access to be verified |
| Review branch | `main`; record the submitted commit |
| Public demo URL | Not configured |
| Video URL | Not recorded |
| Real Foundry verification | Deferred until cloud credentials are configured |

## Honest project scope

All teams, players and match data are synthetic. Live mode is a paced simulation
of four one-minute recordings. Tactical detection is geometric and pre-indexed,
not a trained scouting model or an incremental external-feed processor. Foundry
selects tools and verified server-owned claims; it does not write unrestricted
factual prose. Synthetic regression scores do not measure real-match accuracy,
editorial quality, or a probability of winning the competition.
