import asyncio
import json
from uuid import uuid4
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.live import LiveSessions, MAX_SESSIONS, SESSION_TTL
from app.main import matches


@pytest.fixture
def live(monkeypatch):
    import app.main as main
    clock=[100.0]
    sessions=LiveSessions(matches,clock=lambda:clock[0])
    monkeypatch.setattr(main,'live_sessions',sessions)
    return sessions,clock,TestClient(main.app)


def create(client,scenario='standard',session_id=None):
    return client.post('/api/live',json={'scenario':scenario,'session_id':session_id or str(uuid4())})


def frames(response):
    return [json.loads(block.split('data: ',1)[1]) for block in response.text.split('\n\n') if 'event: frame' in block]


def test_bootstrap_has_no_future_frames_or_events(live):
    sessions,clock,client=live
    key=str(uuid4());first=create(client,session_id=key).json()
    assert first['match']['times']==[0]
    assert len(first['match']['positions'])==len(first['match']['ball'])==1
    assert first['match']['events']==[]
    clock[0]+=3
    assert create(client,session_id=key).json()==first
    assert len(sessions.sessions)==1
    assert sessions.get(key).available_time(clock[0])==3
    assert create(client,'variation',key).status_code==409


def test_analysis_and_explanation_are_bounded_by_producer_time(live,monkeypatch):
    sessions,clock,client=live
    monkeypatch.setenv('AI_ENABLED','false')
    key=create(client).json()['session_id']
    response=client.get(f'/api/analysis?at=60&session_id={key}').json()
    assert response['at']==0 and response['insights']==[] and response['player']['attempts']==0
    explanation=client.post('/api/explain',json={'at':60,'player_id':7,'session_id':key}).json()
    assert explanation['at']==0 and explanation['event_ids']==[]
    clock[0]+=9
    response=client.get(f'/api/analysis?at=60&session_id={key}').json()
    assert response['at']==9 and len(response['insights'])==1
    assert client.get(f'/api/analysis?at=8&session_id={key}').json()['insights']==[]
    assert client.get(f'/api/analysis?scenario=variation&session_id={key}').status_code==409


def test_sse_delivers_ordered_frames_and_events_once_then_finishes(live):
    sessions,clock,client=live
    key=create(client).json()['session_id'];clock[0]+=60
    response=client.get(f'/api/live/{key}/events')
    assert response.headers['content-type'].startswith('text/event-stream')
    assert response.headers['x-accel-buffering']=='no'
    packets=frames(response)
    assert [p['index'] for p in packets]==list(range(1,601))
    ids=[e['id'] for p in packets for e in p['events']]
    assert ids==[e.id for e in matches['standard'].events]
    assert len(ids)==len(set(ids))
    assert all(e['time']<=p['time'] for p in packets for e in p['events'])
    assert packets[-1]['positions']==matches['standard'].positions[-1]
    assert response.text.endswith('event: complete\ndata: {}\n\n')


def test_resume_prefers_last_event_id_and_does_not_skip_history(live):
    sessions,clock,client=live
    key=create(client).json()['session_id'];clock[0]+=60
    response=client.get(f'/api/live/{key}/events?after=1',headers={'Last-Event-ID':'38'})
    packets=frames(response)
    assert packets[0]['index']==39
    assert packets[0]['events']==[]
    assert packets[1]['events'][0]['id']=='e1'
    assert len(packets)==562
    assert client.get(f'/api/live/{key}/events',headers={'Last-Event-ID':'oops'}).status_code==400
    assert client.get(f'/api/live/{key}/events?after=601').status_code==409


def test_no_packets_are_emitted_ahead_of_clock_and_disconnect_closes_generator(live):
    sessions,clock,client=live
    session=sessions.get(create(client).json()['session_id'])
    class Request:
        disconnected=False
        async def is_disconnected(self): return self.disconnected
    async def check():
        request=Request();stream=sessions.stream(session,0,request)
        assert 'retry:' in await anext(stream)
        clock[0]+=.11
        packet=await anext(stream)
        assert 'id: 1\n' in packet and 'id: 2\n' not in packet
        request.disconnected=True
        with pytest.raises(StopAsyncIteration): await anext(stream)
    asyncio.run(check())


def test_expiry_and_capacity_are_bounded(live):
    sessions,clock,client=live
    key=create(client).json()['session_id']
    for _ in range(MAX_SESSIONS-1): create(client)
    assert create(client).status_code==429
    clock[0]+=SESSION_TTL
    assert client.get(f'/api/analysis?session_id={key}').status_code==410
    assert 'event: expired' in client.get(f'/api/live/{key}/events').text
    assert create(client).status_code==200
    assert len(sessions.sessions)==1


def test_future_cursor_rejected_before_broadcast_completes(live):
    sessions,clock,client=live
    key=create(client).json()['session_id']
    assert client.get(f'/api/live/{key}/events?after=1').status_code==409
    assert client.get(f'/api/analysis?session_id={uuid4()}').status_code==410

def test_assistant_pattern_evidence_respects_live_and_replay_boundaries(live):
    sessions,clock,client=live
    key=create(client,'tactics').json()['session_id']
    def ask(at,question):
        return client.post('/api/explain',json=dict(at=at,scenario='tactics',player_id=7,session_id=key,question=question)).json()
    clock[0]+=10.9
    assert ask(60,'switch')['scenes']==[]
    clock[0]+=.1
    assert ask(60,'switch')['scenes'][0]['at']==11
    clock[0]+=7
    assert ask(60,'overload')['scenes'][0]['at']==18
    assert ask(17.9,'overload')['scenes']==[]
    assert ask(10.9,'switch')['scenes']==[]
