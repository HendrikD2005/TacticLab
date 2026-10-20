import asyncio
import json
from uuid import uuid4
import httpx
import pytest
from fastapi.testclient import TestClient
from app import foundry
from app.main import app, matches, engines
from app.live import LiveSessions
from app.models import AnalysisRequest
from app.recaps import build_recap

client = TestClient(app)


@pytest.mark.parametrize("at", [0, 10.9, 11, 17.9, 18, 60])
@pytest.mark.parametrize("language", ["en", "de"])
def test_report_contains_only_completed_evidence(at, language):
    data = client.get(f"/api/analysis?scenario=tactics&at={at}&player_id=1&language={language}").json()
    recap = data["recap"]
    assert recap["language"] == language
    assert recap["scope_type"] == "team"
    assert recap["at"] == data["at"] == at
    assert recap["source"] == "deterministic"
    assert recap["claims"][0]["kind"] == "statistics"
    assert len(recap["claims"]) <= 3
    ids = {e.id for e in matches["tactics"].events if e.time <= at}
    assert set(recap["event_ids"]) <= ids
    assert all(c["at"] <= at and set(c["event_ids"]) <= ids for c in recap["claims"])
    assert all(s["at"] <= at for s in recap["scenes"])
    patterns = [c for c in recap["claims"] if c["id"].startswith("pattern:")]
    assert ("pattern:switch-e2" in [c["id"] for c in patterns]) == (at >= 11)
    if at < 18:
        assert all(c["kind"] != "local_overload" for c in patterns)


def test_report_fan_language_and_team_scope():
    path = "/api/analysis?scenario=tactics&at=18&player_id=1&language=de"
    analyst = client.get(path).json()["recap"]
    fan = client.get(path + "&mode=fan").json()["recap"]
    away = client.get("/api/analysis?scenario=tactics&at=18&player_id=12").json()["recap"]
    assert fan["text"] != analyst["text"]
    assert fan["mode"] == "fan" and "mehr" in fan["text"]
    assert away["scope"] == "Team Riverside"
    assert not any(c["id"].startswith("pattern:") for c in away["claims"])
    assert client.get(path + "&mode=unknown").status_code == 422


def test_live_report_and_explicit_report_are_server_bounded(monkeypatch):
    import app.main as main
    clock = [100.]
    monkeypatch.setattr(main, "live_sessions", LiveSessions(matches, clock=lambda: clock[0]))
    key = client.post("/api/live", json={"scenario":"tactics","session_id":str(uuid4())}).json()["session_id"]
    clock[0] += 10.9
    report = client.get(f"/api/analysis?scenario=tactics&at=60&session_id={key}").json()["recap"]
    explicit = client.post("/api/explain", json={"at":60,"player_id":1,"scenario":"tactics","session_id":key,"question":"recap"}).json()
    for result in (report, explicit):
        assert result["at"] == pytest.approx(10.9)
        assert all(c["at"] <= result["at"] for c in result["claims"])
        assert not any(c["id"] == "pattern:switch-e2" for c in result["claims"])


@pytest.mark.parametrize("ids,expected", [
    (["statistics:passing","pattern:switch-e2"], "foundry"),
    (["statistics:passing"], "deterministic"),
    (["pattern:switch-e2"], "deterministic"),
])
def test_foundry_recap_requires_statistics_and_confirmed_pattern(monkeypatch, ids, expected):
    monkeypatch.setenv("AI_ENABLED","true")
    monkeypatch.setenv("AZURE_AI_BASE_URL","https://test.openai.azure.com/openai/v1/")
    monkeypatch.setenv("AZURE_AI_API_KEY","offline-key")
    monkeypatch.setenv("AZURE_AI_DEPLOYMENT","offline-model")
    foundry.calls.clear()
    request = AnalysisRequest(at=18,player_id=1,scenario="tactics",question="recap")
    base = build_recap(matches["tactics"],request,engines["tactics"])
    responses = [
        {"role":"assistant","content":None,"tool_calls":[{"id":"a","type":"function","function":{"name":"get_passing_statistics","arguments":"{}"}}]},
        {"role":"assistant","content":None,"tool_calls":[{"id":"b","type":"function","function":{"name":"get_tactical_findings","arguments":'{"kind":"all"}'}}]},
        {"role":"assistant","content":json.dumps({"claim_ids":ids})},
    ]
    def respond(req):
        return httpx.Response(200,json={"choices":[{"message":responses.pop(0),"finish_reason":"stop"}]})
    result = asyncio.run(foundry.run_agent(matches["tactics"],request,engines["tactics"],base,transport=httpx.MockTransport(respond)))
    assert result["source"] == expected
    assert result["claims"]
