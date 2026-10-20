import httpx
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.mark.parametrize("query", [
    "Did Theo Wolf score a hat trick?",
    "Hat Theo Wolf einen Hattrick erzielt?",
    "How many goals and passes did Theo Wolf score?",
    "Wie viele Tore und Pässe hatte Finn Roth?",
    "What is Theo Wolf's xG?",
    "Predict the winner based on pressing",
    "Which switches did Messi play?",
    "Where was Theo Wolf born?",
    "What is the player's password?",
    "Compare Theo Wolf and Leon West",
    "Switches and overloads",
    "How fast did Theo Wolf run?",
])
def test_unknown_or_mixed_intents_never_call_foundry(monkeypatch, query):
    monkeypatch.setenv("AI_ENABLED","true")
    monkeypatch.setenv("AZURE_AI_BASE_URL","https://test.openai.azure.com/openai/v1/")
    monkeypatch.setenv("AZURE_AI_API_KEY","offline")
    monkeypatch.setenv("AZURE_AI_DEPLOYMENT","offline")
    async def forbidden(*a,**kw):
        pytest.fail("Unsupported intent must not call a model")
    monkeypatch.setattr(httpx.AsyncClient,"post",forbidden)
    result = client.post("/api/explain",json=dict(scenario="tactics",at=18,player_id=7,query=query)).json()
    assert result["unsupported"] is True
    assert result["scenes"] == [] and result["event_ids"] == []
    assert result["agent"]["status"] == "skipped"
    assert result["agent"]["model_calls"] == 0


@pytest.mark.parametrize("query,topic,player", [
    ("Which switches did Theo Wolf play?", "switch", 1),
    ("Welche Spielverlagerungen spielte Theo Wolf?", "switch", 1),
    ("Theo Wolf", "player", 1),
    ("How did Leon West play?", "player", 4),
    ("Explain Finn Roth's passing", "player", 5),
    ("Welche Überzahl hatte Finn Roth?", "overload", 5),
    ("Compare periods", "compare", 7),
    ("Explain pressing", "pressing", 7),
    ("Zeige die Passstatistik für Finn Roth", "player", 5),
])
def test_supported_bilingual_examples_keep_topic_and_player(query, topic, player):
    result = client.post("/api/explain",json=dict(scenario="tactics",at=18,player_id=7,query=query)).json()
    assert result["unsupported"] is False
    assert result["topic"] == topic
    assert result["player_id"] == player


@pytest.mark.parametrize("query", ["How many passes did Theo Wolf complete?", "Wie viele Pässe spielte Theo Wolf?"])
def test_natural_passing_count_questions(query):
    result=client.post("/api/explain",json=dict(scenario="tactics",at=18,player_id=7,query=query)).json()
    assert not result["unsupported"]
    assert result["scope"] == "Theo Wolf" and result["scope_type"] == "player"


@pytest.mark.parametrize("query", ["Explain team passes", "Zeige die Passstatistik der Mannschaft"])
def test_explicit_team_passing_does_not_fall_back_to_selected_player(query):
    result=client.post("/api/explain",json=dict(scenario="tactics",at=18,player_id=7,query=query)).json()
    assert not result["unsupported"]
    assert result["scope"] == "Team Northbridge" and result["scope_type"] == "team"
    assert "3/3" in result["text"]
