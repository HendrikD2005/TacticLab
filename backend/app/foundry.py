"""Bounded Microsoft Foundry Models tool-calling agent.

The model chooses read-only tools and orders server-owned claims. Final output is
strict JSON containing claim IDs only. Trusted localized text is rendered after
validating the selection; model-authored factual prose is never displayed.
"""
import asyncio
from collections import deque
from dataclasses import dataclass
import json
import os
from threading import BoundedSemaphore, Lock
import time
from urllib.parse import urlsplit

import httpx

from .evidence import EvidenceTools, render_selection
from .i18n import text as tr

MAX_MODEL_CALLS = 4
MAX_TOOL_CALLS = 6
gate = BoundedSemaphore(2)
quota_lock = Lock()
calls = deque()


@dataclass(frozen=True)
class Config:
    enabled: bool
    endpoint: str
    key: str
    deployment: str
    hourly_limit: int
    error: str | None

    @property
    def ready(self):
        return self.enabled and self.error is None


def configuration():
    enabled = os.getenv("AI_ENABLED", "false").lower() == "true"
    endpoint = os.getenv("AZURE_AI_BASE_URL", "").strip().rstrip("/")
    key = os.getenv("AZURE_AI_API_KEY", "").strip()
    deployment = os.getenv("AZURE_AI_DEPLOYMENT", "").strip()
    error = None
    try:
        limit = int(os.getenv("AI_MAX_CALLS_PER_HOUR", "20"))
        if not 1 <= limit <= 1000:
            raise ValueError()
    except ValueError:
        limit, error = 20, "configuration"
    if not all((endpoint, key, deployment)):
        error = "configuration"
    if endpoint:
        try:
            url = urlsplit(endpoint)
            host = url.hostname or ""
            if (url.scheme != "https" or url.username or url.password or url.query or url.fragment
                    or url.port not in (None, 443) or url.path != "/openai/v1"
                    or not any(host.endswith(suffix) and host != suffix[1:]
                               for suffix in (".openai.azure.com", ".services.ai.azure.com"))):
                error = "endpoint"
        except ValueError:
            error = "endpoint"
    return Config(enabled, endpoint, key, deployment, limit, error)


def status():
    config = configuration()
    return dict(
        provider="microsoft_foundry",
        status="ready" if config.ready else "unconfigured" if config.enabled else "disabled",
        configured=config.error is None,
        validation="server_owned_claims",
        max_model_calls=MAX_MODEL_CALLS,
        hourly_model_call_limit=config.hourly_limit,
    )


def reserve(limit):
    now = time.monotonic()
    with quota_lock:
        while calls and calls[0] <= now - 3600:
            calls.popleft()
        if len(calls) >= limit:
            raise AgentFailure("quota")
        calls.append(now)


class AgentFailure(Exception):
    pass


def tool(name, description, properties=None):
    properties = properties or {}
    return dict(type="function", function=dict(
        name=name, description=description, strict=True,
        parameters=dict(type="object", properties=properties,
                        required=list(properties), additionalProperties=False),
    ))


TOOLS = [
    tool("get_passing_statistics", "Calculated passing statistics for the fixed request scope."),
    tool("get_tactical_findings", "Confirmed patterns for the fixed scope, never future scenes.",
         {"kind": {"type": "string", "enum": ["all", "pressing_escape", "switch_of_play", "local_overload"]}}),
    tool("compare_periods", "Compare the team's two equal observed periods; this always describes the team."),
    tool("get_recent_events", "Completed events for the fixed scope.",
         {"limit": {"type": "integer", "enum": [1, 2, 3, 4, 5, 6]}}),
]
SELECTION_FORMAT = {
    "type": "json_schema",
    "json_schema": {"name": "verified_claim_selection", "strict": True, "schema": {
        "type": "object", "properties": {"claim_ids": {"type": "array", "items": {"type": "string"}}},
        "required": ["claim_ids"], "additionalProperties": False,
    }},
}
EXPECTED_KIND = {"player": "statistics", "compare": "comparison", "switch": "switch_of_play",
                 "overload": "local_overload", "pressing": "pressing_escape"}


def validate_selection(value, available, topic):
    if not isinstance(value, dict) or set(value) != {"claim_ids"}:
        raise AgentFailure("validation")
    ids = value["claim_ids"]
    if (not isinstance(ids, list) or not 1 <= len(ids) <= 5
            or any(not isinstance(i, str) or i not in available for i in ids)
            or len(set(ids)) != len(ids)):
        raise AgentFailure("validation")
    selected = [available[i] for i in ids]
    if topic in EXPECTED_KIND and not any(c["kind"] == EXPECTED_KIND[topic] for c in selected):
        raise AgentFailure("validation")
    return selected


async def run_agent(match, request, intelligence, base, *, transport=None):
    config = configuration()
    started = time.monotonic()
    trace = dict(status="disabled", model_calls=0, tools=[], prompt_tokens=0,
                 completion_tokens=0, latency_ms=0, reason=None)

    def fallback(reason, state="fallback"):
        trace.update(status=state, reason=reason, latency_ms=round((time.monotonic() - started) * 1000))
        result = {**base, "agent": trace}
        if reason not in ("disabled", "unsupported"):
            result["notice"] = tr("notice.foundry." + reason, request.language)
        return result

    if base["unsupported"]:
        return fallback("unsupported", "skipped")
    if not config.enabled:
        return fallback("disabled", "disabled")
    if not config.ready:
        return fallback(config.error, "unconfigured")
    evidence = EvidenceTools(match, request, intelligence, base)
    available = {}
    tool_ids = set()
    messages = [
        {"role": "system", "content": (
            "You are TacticLab's evidence editor using Microsoft Foundry. Use read-only tools "
            "to answer the question. All data is synthetic. The request scope, language, audience "
            "and time are fixed by the server. Do not change scope or infer goals, intent or causality. "
            "First obtain relevant evidence using tools. Then select and order 1-5 returned claim IDs "
            "that directly answer the question. A player question needs passing statistics; tactical "
            "questions need the corresponding pattern/count; period questions need a comparison. "
            "For a recap include passing statistics and, when present, a confirmed tactical scene. "
            "Do not emit prose or invent IDs. If a tool fails, retry a valid read-only tool."
        )},
        {"role": "user", "content": json.dumps({
            "question": request.query or base["topic"], "topic": base["topic"],
            "context": evidence.context,
        }, ensure_ascii=False)},
    ]
    if not gate.acquire(blocking=False):
        return fallback("busy")
    try:
        async with asyncio.timeout(35):
            async with httpx.AsyncClient(timeout=12, follow_redirects=False, transport=transport) as client:
                for index in range(MAX_MODEL_CALLS):
                    reserve(config.hourly_limit)
                    trace["model_calls"] += 1
                    # Reserve the last round for a structured final selection.
                    final_round = index == MAX_MODEL_CALLS - 1
                    payload = dict(model=config.deployment, messages=messages, max_completion_tokens=1400,
                                   response_format=SELECTION_FORMAT, parallel_tool_calls=False,
                                   tools=TOOLS, tool_choice="none" if final_round else "required" if index == 0 else "auto")
                    response = await client.post(
                        config.endpoint + "/chat/completions", headers={"api-key": config.key}, json=payload)
                    response.raise_for_status()
                    body = response.json()
                    usage = body.get("usage") or {}
                    for key in ("prompt_tokens", "completion_tokens"):
                        count = usage.get(key)
                        if type(count) is int and count >= 0:
                            trace[key] += count
                    choice = body["choices"][0]
                    message = choice["message"]
                    if choice.get("finish_reason") in ("length", "content_filter") or message.get("refusal"):
                        raise AgentFailure("validation")
                    tool_calls = message.get("tool_calls") or []
                    if tool_calls:
                        if final_round or not isinstance(tool_calls, list) or len(tool_calls) + len(trace["tools"]) > MAX_TOOL_CALLS:
                            raise AgentFailure("budget")
                        normalized = []
                        for call in tool_calls:
                            if (not isinstance(call.get("id"), str) or not call["id"]
                                    or len(call["id"]) > 200 or call["id"] in tool_ids
                                    or call.get("type") != "function"):
                                raise AgentFailure("validation")
                            tool_ids.add(call["id"])
                            normalized.append({"id": call["id"], "type": "function", "function": call["function"]})
                        messages.append({"role": "assistant", "content": None, "tool_calls": normalized})
                        for call in normalized:
                            function = call["function"]
                            name = function.get("name")
                            args = function.get("arguments", "")
                            try:
                                if not isinstance(args, str) or len(args) > 1000:
                                    raise ValueError("Invalid arguments")
                                result = evidence.execute(name, json.loads(args))
                                for claim in result["claims"]:
                                    available[claim["id"]] = claim
                                trace["tools"].append(dict(name=name, status="ok",
                                                           claim_ids=[c["id"] for c in result["claims"]]))
                            except (ValueError, TypeError):
                                result = {"error": "Unknown tool or invalid arguments. Use the listed tool schema."}
                                # Never reflect untrusted function names into the UI.
                                trace["tools"].append(dict(name=name if name in {t["function"]["name"] for t in TOOLS} else "unknown",
                                                           status="rejected", claim_ids=[]))
                            messages.append({"role": "tool", "tool_call_id": call["id"],
                                             "content": json.dumps(result, ensure_ascii=False)})
                        continue
                    if index == 0 or not available:
                        raise AgentFailure("validation")
                    selected = validate_selection(json.loads(message["content"]), available, base["topic"])
                    if base["topic"] == "recap":
                        if not any(c["kind"] == "statistics" for c in selected):
                            raise AgentFailure("validation")
                        if evidence.findings and not any(c["id"].startswith("pattern:") for c in selected):
                            raise AgentFailure("validation")
                    trace.update(status="completed", latency_ms=round((time.monotonic() - started) * 1000))
                    return {**render_selection(base, selected, request.language, request.mode),
                            "source": "foundry", "agent": trace}
                raise AgentFailure("budget")
    except AgentFailure as error:
        return fallback(str(error))
    except (httpx.HTTPError, TimeoutError):
        return fallback("unavailable")
    except (ValueError, KeyError, IndexError, TypeError, AttributeError):
        return fallback("validation")
    finally:
        gate.release()
