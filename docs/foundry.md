# Microsoft Foundry integration

TacticLab uses a real Microsoft Foundry Models deployment through the Azure
OpenAI-compatible v1 Chat Completions API. The agent runs in the existing FastAPI
process. A hosted Agent Service deployment and `azd` are not required.

## Configure later

Copy `.env.example` to `.env` in the repository root and set:

```dotenv
AI_ENABLED=true
AZURE_AI_BASE_URL=https://YOUR-RESOURCE.openai.azure.com/openai/v1/
AZURE_AI_API_KEY=YOUR-SERVER-SIDE-KEY
AZURE_AI_DEPLOYMENT=YOUR-DEPLOYMENT-NAME
AI_MAX_CALLS_PER_HOUR=20
```

Use the **resource's model inference endpoint**, not the Foundry portal URL or
the `/api/projects/...` management endpoint. Resource endpoints under
`*.services.ai.azure.com/openai/v1/` are also accepted. HTTPS on port 443,
without URL credentials or query parameters, is required. Redirects are not
followed. No keys, endpoints or raw model responses are returned to the browser.

The deployment must support Chat Completions, function calling,
`max_completion_tokens`, and strict JSON-schema output together. Use a model
appropriate for short tool-calling requests; the integration does not create a
model deployment, subscription, or billable resource.

Restart the backend after changing `.env`. `/api/health` exposes only safe
readiness and limit information. `AI_ENABLED=false` guarantees local analysis
without model requests. Tests force this flag off except when using an in-memory
HTTP simulator.

## What the model does

1. Receives the question and fixed scope: replay time, scenario, player/team,
   language and fan/analyst mode.
2. Chooses read-only tools for passing statistics, confirmed tactical findings,
   recent completed events or period comparison. The server executes them.
3. Receives a catalog of calculated claims with event IDs and scene timestamps.
4. Selects and orders claim IDs using strict structured output.
5. The server validates the IDs, topic and selection, then renders the
   corresponding localized claims and limitations.

This is tool-calling evidence selection, not a wording-only adapter. The model
does **not** write unrestricted factual prose. Keeping the final sentences under
server control makes grounding enforceable: the model cannot change values,
invent names, claim causality or cite a future scene. It can still make a poor
editorial choice among valid claims; evaluate usefulness separately from
factual integrity. Do not market this as arbitrary natural-language generation.

All tools use one server-owned context. Tool arguments cannot change the replay
time, scenario, player or team. A period comparison explicitly describes the
team. Event and finding cutoffs apply before evidence is supplied to the model.
The UI can show the actual tool sequence, token usage and elapsed time.

## Bounds and failures

- At most four model calls, six tool calls and 35 seconds per analysis.
- At most two concurrent model analyses per process.
- The hourly quota counts **every outgoing model call**, including failed calls,
  not just user questions. Output is capped at 1,400 tokens per call.
- Invalid output, unknown claim IDs, refusals, truncation, malformed arguments,
  transport errors and exhausted limits return calculated local facts with a
  visible fallback notice.
- The quota is process-local, not a shared billing cap. Browser cancellation does
  not promise to cancel an already accepted provider request. Do not expose paid
  mode publicly without authentication, a shared quota and deployment limits.

## Verification

From the repository root:

```powershell
.venv\Scripts\python.exe -m pytest
.venv\Scripts\python.exe scripts\foundry-smoke.py
# Only after configuring a real deployment; up to four billable calls:
.venv\Scripts\python.exe scripts\foundry-smoke.py --live
```

The default smoke invocation is configuration-only. The live invocation exits
unsuccessfully if the result fell back locally; it cannot silently pass as
"Foundry tested". Unit tests use `httpx.MockTransport` to exercise actual request
and response payloads, tool-result handoffs, replay limits, schema validation,
credential routing, failures and quotas.

Cloud credentials were intentionally left for later configuration in this
implementation. A simulated protocol test does not certify a specific Azure
deployment. Record the deployment and successful live smoke result before a demo.

References:
- [Microsoft: function calling](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/function-calling)
- [Microsoft: structured outputs and supported schema subset](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs)
