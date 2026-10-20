"""Exercise the real HTTP protocol with a simulated Foundry service, never paid calls."""
import asyncio
import json
import time

import httpx
import pytest

from app import foundry
from app.assistant import answer
from app.evidence import EvidenceTools
from app.main import matches, engines
from app.models import AnalysisRequest


@pytest.fixture(autouse=True)
def config(offline_ai, monkeypatch):
    monkeypatch.setenv("AI_ENABLED", "true")
    monkeypatch.setenv("AZURE_AI_BASE_URL", "https://test-resource.openai.azure.com/openai/v1/")
    monkeypatch.setenv("AZURE_AI_API_KEY", "test-only-key")
    monkeypatch.setenv("AZURE_AI_DEPLOYMENT", "test-deployment")
    monkeypatch.setenv("AI_MAX_CALLS_PER_HOUR", "20")
    foundry.calls.clear()


def tool_call(name="get_tactical_findings", arguments=None, id="call_1"):
    if arguments is None:
        arguments = {"kind": "switch_of_play"}
    return {"id": id, "type": "function",
            "function": {"name": name, "arguments": json.dumps(arguments)}}


def completion(*, tools=None, ids=None, content=None, finish="stop"):
    message = {"role": "assistant", "content": content if content is not None else json.dumps({"claim_ids": ids or []})}
    if tools is not None:
        message = {"role": "assistant", "content": None, "tool_calls": tools}
    return httpx.Response(200, json={"choices": [{"message": message, "finish_reason": finish}],
                                   "usage": {"prompt_tokens": 100, "completion_tokens": 40}})


def run(responses, **kwargs):
    request = AnalysisRequest(scenario="tactics", at=kwargs.pop("at", 18), player_id=1,
                              question=kwargs.pop("question", "switch"), **kwargs)
    base, _, _ = answer(matches["tactics"], request, engines["tactics"])
    sent = []
    def respond(req):
        sent.append(json.loads(req.content))
        assert req.headers["api-key"] == "test-only-key"
        assert req.url.path == "/openai/v1/chat/completions"
        item = responses[len(sent)-1]
        if isinstance(item, Exception):
            raise item
        return item
    result = asyncio.run(foundry.run_agent(matches["tactics"], request, engines["tactics"], base,
                                          transport=httpx.MockTransport(respond)))
    return result, sent


def test_real_tool_roundtrip_selects_only_verified_scene():
    result, sent = run([completion(tools=[tool_call()]), completion(ids=["pattern:switch-e2"])])
    assert result["source"] == "foundry"
    assert result["scenes"][0]["at"] == 11
    assert result["event_ids"] == ["e2"]
    assert result["claims"][0]["id"] == "pattern:switch-e2"
    assert "45 m" in result["text"]
    assert result["agent"]["model_calls"] == 2
    assert result["agent"]["prompt_tokens"] == 200
    assert result["agent"]["status"] == "completed"
    assert sent[0]["tool_choice"] == "required"
    assert sent[0]["parallel_tool_calls"] is False
    assert sent[1]["messages"][-1]["role"] == "tool"
    evidence = json.loads(sent[1]["messages"][-1]["content"])
    assert evidence["context"]["at"] == 18
    assert all(c["at"] <= 18 for c in evidence["claims"])


@pytest.mark.parametrize("content", [
    '{"claim_ids":["pattern:invented"]}',
    '{"claim_ids":["pattern:switch-e2"],"text":"Theo scored three goals"}',
    '{"claim_ids":["pattern:switch-e2","pattern:switch-e2"]}',
    '{"claim_ids":[]}',
    'not json',
])
def test_invalid_or_invented_claims_fall_back_without_displaying_model_text(content):
    result, _ = run([completion(tools=[tool_call()]), completion(content=content)])
    assert result["source"] == "deterministic"
    assert result["agent"]["reason"] == "validation"
    assert "three goals" not in result["text"]


def test_future_scene_not_available_to_model():
    result, sent = run([completion(tools=[tool_call()]), completion(ids=["pattern:switch-e2"])], at=10.9)
    assert result["source"] == "deterministic"
    assert result["scenes"] == []
    assert "pattern:switch-e2" not in sent[1]["messages"][-1]["content"]


def test_count_only_answer_still_delivers_the_promised_scene():
    result, _ = run([completion(tools=[tool_call()]), completion(ids=["count:switch_of_play"])])
    assert result["source"] == "foundry"
    assert len(result["scenes"]) == 1
    assert result["scenes"][0]["insight_id"] == "switch-e2"


def test_irrelevant_final_selection_is_rejected():
    result, _ = run([completion(tools=[tool_call("get_passing_statistics", {})]),
                     completion(ids=["statistics:passing"])])
    assert result["agent"]["reason"] == "validation"


def test_invalid_scope_arguments_are_rejected_then_model_can_recover():
    result, sent = run([
        completion(tools=[tool_call(arguments={"kind": "switch_of_play", "at": 60})]),
        completion(tools=[tool_call(id="call_2")]),
        completion(ids=["pattern:switch-e2"]),
    ])
    assert result["source"] == "foundry"
    assert result["agent"]["tools"][0]["status"] == "rejected"
    assert "error" in json.loads(sent[1]["messages"][-1]["content"])
    assert result["agent"]["model_calls"] == 3


def test_model_loop_is_bounded():
    result, sent = run([completion(tools=[tool_call(id=f"call_{i}")]) for i in range(4)])
    assert len(sent) == 4
    assert sent[-1]["tool_choice"] == "none"
    assert result["agent"]["reason"] == "budget"


@pytest.mark.parametrize("failure", [httpx.ReadTimeout("timeout"), httpx.Response(429, json={}),
                                    httpx.Response(401, json={}), httpx.Response(200, json={})])
def test_service_failures_return_local_facts(failure):
    result, _ = run([failure])
    assert result["source"] == "deterministic"
    assert result["agent"]["status"] == "fallback"
    assert result["notice"]


def test_quota_counts_each_actual_model_request(monkeypatch):
    monkeypatch.setenv("AI_MAX_CALLS_PER_HOUR", "1")
    result, sent = run([completion(tools=[tool_call()])])
    assert len(sent) == 1
    assert result["agent"]["model_calls"] == 1
    assert result["agent"]["reason"] == "quota"


@pytest.mark.parametrize("endpoint", [
    "http://test.openai.azure.com/openai/v1",
    "https://example.org/openai/v1",
    "https://test.openai.azure.com.evil.example/openai/v1",
    "https://test.openai.azure.com/openai/v1?key=secret",
    "https://user:secret@test.openai.azure.com/openai/v1",
    "https://test.openai.azure.com:8080/openai/v1",
    "https://test.openai.azure.com/",
])
def test_invalid_configuration_never_sends_credentials(monkeypatch, endpoint):
    monkeypatch.setenv("AZURE_AI_BASE_URL", endpoint)
    result, sent = run([])
    assert sent == []
    assert result["agent"]["status"] == "unconfigured"


def test_redirect_not_followed():
    result, sent = run([httpx.Response(307, headers={"Location": "https://example.org"})])
    assert len(sent) == 1
    assert result["source"] == "deterministic"


def test_disabled_or_missing_configuration_does_not_contact_provider(monkeypatch):
    monkeypatch.setenv("AI_ENABLED", "false")
    result, sent = run([])
    assert result["agent"]["status"] == "disabled" and not sent
    monkeypatch.setenv("AI_ENABLED", "true")
    monkeypatch.delenv("AZURE_AI_API_KEY")
    result, sent = run([])
    assert result["agent"]["status"] == "unconfigured" and not sent
    assert "key" not in json.dumps(foundry.status())


def test_tools_are_scoped_to_named_player_and_confirmed_time():
    req = AnalysisRequest(scenario="tactics", at=18, player_id=7, query="Which switches did Theo Wolf play?")
    base, _, _ = answer(matches["tactics"], req, engines["tactics"])
    tools = EvidenceTools(matches["tactics"], req, engines["tactics"], base)
    stats = tools.execute("get_passing_statistics", {})["claims"][0]
    assert "Theo Wolf" in stats["text"]
    for eid in stats["event_ids"]:
        event = next(e for e in matches["tactics"].events if e.id == eid)
        assert event.player_id == 1 and event.time <= 18


def test_concurrency_limit_is_nonblocking():
    assert foundry.gate.acquire(blocking=False)
    assert foundry.gate.acquire(blocking=False)
    try:
        result, sent = run([])
        assert result["agent"]["reason"] == "busy" and not sent
    finally:
        foundry.gate.release()
        foundry.gate.release()


def test_old_quota_entries_expire():
    foundry.calls.append(time.monotonic()-3601)
    foundry.reserve(1)
    assert len(foundry.calls) == 1
