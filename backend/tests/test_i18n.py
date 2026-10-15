from collections import deque
from copy import deepcopy
from string import Formatter
import httpx
import pytest
from fastapi.testclient import TestClient
from app.main import app, intelligence
from app.i18n import CATALOGS

client=TestClient(app)


def test_catalogue_keys_and_arguments_match():
    assert CATALOGS['en'].keys()==CATALOGS['de'].keys()
    def arguments(value): return sorted(field for _,field,_,_ in Formatter().parse(value) if field)
    for key in CATALOGS['en']:
        assert arguments(CATALOGS['en'][key])==arguments(CATALOGS['de'][key])


def test_localization_does_not_mutate_shared_findings():
    original=deepcopy(intelligence.insights)
    en=client.get('/api/analysis?at=9').json()
    de=client.get('/api/analysis?at=9&language=de').json()
    assert en['language']=='en'
    assert en['insights'][0]['title']=='Pressure escape'
    assert de['insights'][0]['title']=='Pressingdurchbruch'
    assert '8.1' in en['insights'][0]['explanation']
    assert '8,1' in de['insights'][0]['explanation']
    assert en['insights'][0]['evidence']==de['insights'][0]['evidence']
    assert en['insights'][0]['overlay']==de['insights'][0]['overlay']
    assert intelligence.insights==original
    assert client.get('/api/analysis?at=9').json()==en
    assert client.get('/api/analysis?language=fr').status_code==422


@pytest.mark.parametrize('question',['player','pressing','compare'])
def test_explanations_default_to_english(monkeypatch,question):
    monkeypatch.setenv('AI_ENABLED','false')
    response=client.post('/api/explain',json=dict(at=9,player_id=7,question=question)).json()
    assert response['language']=='en'
    assert any(word in response['text'] for word in ['passes','Nearest opponent'])
    assert client.post('/api/explain',json=dict(at=9,player_id=7,language='fr')).status_code==422


@pytest.mark.parametrize('language,expected',[('en','Showing calculated facts'),('de','Berechnete Fakten werden angezeigt')])
@pytest.mark.parametrize('failure',['limit','https','unavailable'])
def test_fallback_notices_are_localized(monkeypatch,language,expected,failure):
    from app import ai
    monkeypatch.setattr(ai,'configured',lambda:True)
    monkeypatch.setattr(ai,'calls',deque())
    monkeypatch.setenv('AI_MAX_CALLS_PER_HOUR','0' if failure=='limit' else '20')
    monkeypatch.setenv('AZURE_AI_BASE_URL','http://invalid' if failure=='https' else 'https://invalid')
    monkeypatch.setenv('AZURE_AI_API_KEY','test-only')
    monkeypatch.setenv('AZURE_AI_DEPLOYMENT','test-only')
    async def unavailable(*args,**kwargs): raise httpx.ConnectError('simulated offline')
    monkeypatch.setattr(httpx.AsyncClient,'post',unavailable)
    response=client.post('/api/explain',json=dict(at=9,player_id=7,question='pressing',language=language)).json()
    assert response['source']=='deterministic'
    assert response['language']==language
    assert expected in response['notice']
