import pytest
from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def ask(**kwargs):
    response=client.post('/api/explain',json=dict(scenario='tactics',at=18,player_id=7,**kwargs))
    assert response.status_code==200
    return response.json()


@pytest.mark.parametrize('question,threshold,insight',[('switch',11,'switch-e2'),('overload',18,'overload-e3')])
def test_confirmation_boundary(question,threshold,insight):
    def get(at):
        return client.post('/api/explain',json=dict(scenario='tactics',at=at,player_id=7,question=question)).json()
    assert get(threshold-.01)['scenes']==[]
    answer=get(threshold)
    assert answer['scenes'][0]['insight_id']==insight
    assert answer['scenes'][0]['at']==threshold
    assert all(s['at']<=answer['at'] for s in answer['scenes'])


@pytest.mark.parametrize('query,topic,player',[('Which switches did Theo Wolf play?','switch',1),('Welche Überzahl hatte Finn Roth?','overload',5),('How did Leon West play?','player',4)])
def test_named_player_and_topic(query,topic,player):
    result=ask(query=query)
    assert result['player_id']==player
    assert result['topic']==topic
    assert result['unsupported'] is False
    assert result['scenes']
    assert all(scene['at']<=18 for scene in result['scenes'])


def test_uninvolved_player_and_team_have_no_pattern():
    assert ask(query='Which switches did Jonas Falk play?')['scenes']==[]
    assert ask(query='Overloads for Alex Reed')['scenes']==[]


@pytest.mark.parametrize('query',['Predict the winner','Compare Theo Wolf and Leon West','Switches and overloads'])
def test_unsupported_or_ambiguous_questions_do_not_invent_answers(query):
    result=ask(query=query)
    assert result['unsupported']
    assert result['scenes']==[]
    assert result['source']=='deterministic'


def test_all_scene_evidence_is_in_available_history():
    for topic in ['player','switch','overload','compare','pressing']:
        for at in [0,10.9,11,17.9,18,60]:
            result=client.post('/api/explain',json=dict(scenario='tactics',at=at,player_id=5,question=topic,language='de')).json()
            assert result['language']=='de'
            assert len(result['scenes'])<=6
            assert all(0<=s['start']<=s['end']<=s['at']<=at for s in result['scenes'])
            assert set(result['event_ids'])=={e for s in result['scenes'] for e in s['event_ids']}


def test_query_limit():
    assert client.post('/api/explain',json=dict(at=18,player_id=7,query='a'*241)).status_code==422
