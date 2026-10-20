# Quality gates and integration policy

TacticLab uses the `checks` workflow on pushes to `main`, `dev` and `feature/**`, and on
pull requests targeting `main` or `dev`. It never deploys or promotes branches. The stable
aggregate check is **`ci`**: it fails if any prerequisite fails, is cancelled or
is skipped. Feature branches are integrated only after the exact commit has a
green run; the integrated `dev` revision is checked again.

## Decisions for this project

| Gate | Blocking condition | Why it belongs here |
| --- | --- | --- |
| Static correctness | TypeScript strict typecheck, build or high-signal Ruff rules fail | Catch invalid code without forcing a large formatting rewrite |
| Architecture | Import contracts, unresolved imports, cycles, browser Node dependencies, or negative fixtures fail | Keep the local analysis core independent of HTTP/cloud and UI primitives independent of product state |
| Backend tests | A test fails on Python 3.12 or 3.13 | Cover the production runtime and the documented local runtime |
| Coverage | Combined statement/branch coverage falls below 90% | Detect loss of coverage against a measured baseline of 93.92%; it does not prove correctness |
| Evidence evaluation | Any deterministic scenario, routing case or grounding invariant fails | Catch future-data leakage and unsupported claims independently of UI appearance |
| Dependency security | npm reports high/critical advisories, or pip-audit reports an advisory in the pinned app/tool dependency set | Check the actual lockfiles; network/audit failures also fail the gate |
| Secrets | Gitleaks finds a credential in the checked-out Git history | Prevent committing Foundry keys and other credentials; reports redact values |
| Production package | Docker build/start, non-root user check or any browser test fails | Test the deployable image, static assets, lazy chunks and API together instead of relying only on Vite |
| Asset budgets | All JavaScript exceeds 270 KiB gzip, CSS 16 KiB gzip, or fonts 400 KiB raw | Catch accidental dependency/asset growth with deterministic measurements |
| Workflow hygiene | Actionlint reports invalid workflow syntax or expressions | Catch broken CI before it becomes the only verification route |

Ruff initially enables `E9`, `F63`, `F7`, and `F82` (syntax and definite correctness
issues). TypeScript already runs in strict mode. We avoid introducing a second
overlapping TypeScript linter or mass formatting changes in this CI change.

The Python import contract is transitive: models, fixtures, detection, routing,
metrics, evidence and local reports may not depend on the API entrypoint, live
transport, cloud agent or HTTP clients. The frontend graph forbids cycles,
unresolved imports and Node built-ins. The replay clock/contracts cannot import
React/UI state; owned UI primitives cannot import match/application modules.
Deliberately invalid fixtures prove the rules reject violations. An empty or
incomplete frontend scan fails, so a missing parser cannot create a false green.

## Reliability and supply chain

Jobs have explicit timeouts, read-only repository permissions and checkouts
without persisted credentials. Superseded runs on the same branch/event are
cancelled. Actions use verified full commit SHAs; Actionlint and Gitleaks release
archives use fixed SHA-256 checksums. npm and Python tools use lockfiles. Caches
contain downloaded dependencies, not test outcomes.

Browser CI uses one worker, rejects `test.only`, allows no retries, and has a
six-minute suite timeout within a fifteen-minute job. Tests run against a
non-root production container with `AI_ENABLED=false`. Foundry protocol tests
use controlled responses; CI never requires Azure credentials or incurs model
charges.

Coverage XML/JUnit, evaluation results, asset measurements, redacted audit
reports, browser HTML/JUnit/traces/screenshots and container logs are retained
for 14 days, including failed runs. Diagnostic cleanup uses best-effort commands;
quality checks do not use `continue-on-error`.

## Local commands

From the repository root after normal setup:

```powershell
.venv/Scripts/python.exe -m pip install -r backend/requirements.lock -r quality/requirements.lock
npm ci
npm --prefix frontend ci
npm run quality:web
.venv/Scripts/python.exe -m ruff check backend evals scripts quality
$env:PYTHONPATH = 'backend'
.venv/Scripts/lint-imports.exe --no-cache
.venv/Scripts/python.exe quality/test_architecture.py
.venv/Scripts/python.exe -m pytest --cov --cov-branch --cov-report=term-missing
.venv/Scripts/python.exe scripts/evaluate.py
npm audit --audit-level=high
npm --prefix frontend audit --audit-level=high
.venv/Scripts/python.exe -m pip_audit -r backend/requirements.lock -r quality/requirements.lock --no-deps --disable-pip
npm run test:e2e
```

On Unix use `.venv/bin/` and `PYTHONPATH=backend`. To test an already running
production build set `PLAYWRIGHT_BASE_URL` to its local URL. The default remains
the managed Vite/backend development servers. Tool versions and hashes are
reviewed in normal feature branches. Regenerate Python tool pins with:

```powershell
.venv/Scripts/pip-compile.exe --strip-extras --allow-unsafe --output-file quality/requirements.lock quality/requirements.in
```

## Repository enforcement

Use `ci` from the **GitHub Actions** app as the required status check on `dev`,
with up-to-date checks and administrator enforcement. Keep force pushes and
branch deletion disabled. This still permits the user's local feature-to-dev
fast-forward workflow after the feature commit passes; it does not require an
unavailable second reviewer or change `main`. Existing stronger protections
must be preserved. Check GitHub settings separately: workflow YAML cannot
enforce branch protection by itself.

Verify required-check enforcement in the repository settings; a successful
workflow does not itself prevent a maintainer from pushing around failed checks.
Enable Secret Scanning and Push Protection where available. These complement
the history scan in CI by detecting supported credentials and blocking new
secret-bearing pushes. Never bypass a secret alert simply to complete a release.

Before every new feature: fetch/integrate current `origin/dev`, create a new
`feature/<name>`, run the applicable local gates, push that feature, verify the
exact GitHub revision, merge into `dev`, push and verify `dev`. Never reset or
force-push a failed feature to make a check disappear. Fix and retest it.

Promotion from `dev` to `main` requires the repository owner's explicit
approval. Promote only the verified `dev` revision and check the resulting
`main` workflow. Keep `dev` current with any completed release fixes.

## Deliberately deferred

- **SonarCloud, mutation testing and 100% coverage:** not necessary to protect
  the current small application; additional services and arbitrary targets
  would add work without evidence that they catch its main risks.
- **Hard FPS/latency thresholds in shared CI:** local frame samples are useful,
  but shared-runner timing is noisy. Asset budgets and functional tests are
  reproducible; sustained performance tests need a controlled environment.
- **Paid Foundry smoke tests and deployment:** require configured cloud access
  and are separate from offline merge gates. A green pipeline does not prove a
  real Azure deployment or real-match accuracy.
- **Automatic dependency merges or production promotion:** updates still need
  the same feature review and gates; `main` remains protected.

## References and adaptation

- [Keiko CI](https://github.com/oscharko-dev/Keiko/blob/dev/.github/workflows/ci.yml)
  and [architecture rules](https://github.com/oscharko-dev/Keiko/blob/dev/.dependency-cruiser.cjs):
  inspiration for explicit boundaries, negative fixtures and a stable aggregate
  gate. TacticLab uses a much smaller set suited to its two applications.
- [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use):
  read-only permissions, immutable action references and untrusted-code handling.
- [Playwright CI](https://playwright.dev/docs/ci): worker isolation, bounded runs
  and retained diagnostic reports.
- [pytest-cov configuration](https://pytest-cov.readthedocs.io/en/stable/config.html)
  and [pip-audit](https://github.com/pypa/pip-audit): measured coverage floors and
  advisory-based dependency checks.
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches):
  repository enforcement of required checks.
