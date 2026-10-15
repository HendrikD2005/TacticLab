import pytest
from fastapi.testclient import TestClient
from app.main import app, match
from app.analysis import metrics, snapshot
from app.data import generate_match

client=TestClient(app)

def test_fixture_is_reproducible_and_in_bounds():
    assert generate_match().model_dump()==generate_match().model_dump()
    assert len(match.players)==22
    assert len(match.positions)==len(match.times)==len(match.ball)
    assert all(0<=x<=105 and 0<=y<=68 for frame in match.positions for x,y in frame)

def test_analysis_never_looks_ahead():
    assert metrics(match,7)['attempts']==0
    assert metrics(match,8)['attempts']==1
    assert snapshot(match,27,7)['sequences']==[]
    assert len(snapshot(match,28,7)['sequences'])==1
    before=metrics(match,19,7)
    assert before['attempts']==0
    assert before['accuracy'] is None
    assert metrics(match,20,7)['attempts']==1

def test_player_and_window_filtering():
    full=metrics(match,120,7)
    assert full['attempts']==4
    assert full['completed']==4
    assert metrics(match,120,7,start=80)['attempts']==1
    a,b=snapshot(match,120,7)['comparison']
    assert a['attempts']+b['attempts']==metrics(match,120)['attempts']

def test_turnover_and_metrics():
    m=metrics(match,52,10)
    assert m['attempts']==1 and m['completed']==0 and m['accuracy']==0
    assert metrics(match,120)['attempts']==14
    assert metrics(match,120)['completed']==13

@pytest.mark.parametrize('query',['at=-1','at=999','player_id=22','at=nan'])
def test_invalid_queries(query):
    assert client.get('/api/analysis?'+query).status_code==422

def test_api_and_free_explanation(monkeypatch):
    monkeypatch.setenv('AI_ENABLED','false')
    assert client.get('/api/health').json()['ai_enabled'] is False
    assert client.get('/api/match').status_code==200
    response=client.post('/api/explain',json={'at':20,'player_id':7,'question':'player','language':'de'})
    data=response.json()
    assert data['source']=='deterministic'
    assert data['event_ids']==['e3']
    assert '1 von 1' in data['text']
