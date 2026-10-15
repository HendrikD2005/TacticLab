from copy import deepcopy
import pytest
from app.models import Event, Match, Player
from app.intelligence import MatchIntelligence
from app.data import generate_match


def sample(*, mirror=False):
    players=[Player(id=i,number=i+1,name=f'Player {i}',team='home' if i<11 else 'away',role='midfield') for i in range(22)]
    frame=[[10,5] for _ in players]
    for i in range(11,22): frame[i]=[90,60]
    frame[2]=[30,34]; frame[5]=[55,34]; frame[11]=[35,34]
    event=Event(id='unseen-pass',time=2,release_time=1,type='pass',player_id=2,target_id=5,
                x=30,y=34,end_x=55,end_y=34,success=True,under_pressure=False,sequence_id='not-an-escape')
    if mirror:
        frame=[[105-x,y] for x,y in frame]
        for p in players: p.team='away' if p.team=='home' else 'home'
        event.x=75;event.end_x=50
    return Match(id='unseen',name='Unseen fixture',duration=8,start_minute=0,sample_hz=2,
                 initial_player_id=2,players=players,times=[i/2 for i in range(17)],
                 positions=[deepcopy(frame) for _ in range(17)],ball=[[30,34]]*17,events=[event])


@pytest.mark.parametrize('mirror',[False,True])
def test_unseen_escape_and_no_lookahead(mirror):
    engine=MatchIntelligence(sample(mirror=mirror))
    assert engine.snapshot(3.999)['insights']==[]
    insight,=engine.snapshot(4)['insights']
    assert insight['event_ids']==['unseen-pass']
    assert insight['evidence']==dict(gain_m=25.0,pressure_before_m=5.0,space_after_m=20.0,bypassed=1,retained_s=2.0)
    assert insight['overlay']['opponents'][0]['id']==11
    assert engine.snapshot(1)['insights']==[]  # scrubbing backwards


def test_possession_releases_and_receptions():
    engine=MatchIntelligence(sample())
    assert engine.possession(0)['player_id']==2
    assert engine.possession(1)['status']=='in_flight'
    assert engine.possession(1)['player_id'] is None
    assert engine.possession(2)['player_id']==5
    assert engine.possession(4)['phase_id']==1
    assert engine.possession(4)['duration']==4


@pytest.mark.parametrize('reason',['no_pressure','no_space','sideways','no_bypassed_opponent','lost','flight','short_match'])
def test_rejects_false_positives(reason):
    m=sample()
    if reason=='no_pressure':
        for frame in m.positions: frame[11]=[44,34]
    elif reason=='no_space':
        for frame in m.positions: frame[12]=[56,34]
    elif reason=='sideways': m.events[0].end_x=35
    elif reason=='no_bypassed_opponent':
        for frame in m.positions: frame[11]=[25,34]
    elif reason in ('lost','flight'):
        m.events.append(Event(id='next',time=3 if reason=='lost' else 5,release_time=2.5,
                             type='pass',player_id=5,target_id=11,x=55,y=34,end_x=35,end_y=34,
                             success=False,under_pressure=True,sequence_id='irrelevant'))
    elif reason=='short_match': m.duration=3
    assert MatchIntelligence(m).snapshot(8)['insights']==[]


def test_regained_ball_does_not_count_as_retention():
    m=sample()
    m.events.extend([
        Event(id='loss',time=3,release_time=2.5,type='pass',player_id=5,target_id=11,x=55,y=34,end_x=35,end_y=34,success=False,under_pressure=False,sequence_id='x'),
        Event(id='regain',time=3.8,release_time=3.2,type='pass',player_id=11,target_id=2,x=35,y=34,end_x=30,end_y=34,success=False,under_pressure=False,sequence_id='x'),
    ])
    engine=MatchIntelligence(m)
    assert engine.possession(3)['team']=='away'
    assert engine.possession(3.8)['team']=='home'
    assert engine.possession(4)['phase_id']==3
    assert engine.snapshot(4)['insights']==[]


def test_unknown_initial_owner_stays_unknown_until_release():
    m=sample();m.initial_player_id=None
    assert MatchIntelligence(m).possession(.5)['status']=='unknown'


def test_annotations_do_not_drive_detection():
    m=sample();a=MatchIntelligence(m).insights
    m.events[0].sequence_id='escape';m.events[0].under_pressure=True
    assert MatchIntelligence(m).insights==a


def test_invalid_possession_chain_is_rejected():
    m=generate_match();m.events[1].player_id=0
    with pytest.raises(ValueError,match='does not own'): MatchIntelligence(m)


@pytest.mark.parametrize('seed',[1,7,42,85,2026])
def test_generated_matches_have_continuous_possession(seed):
    m=generate_match(seed);engine=MatchIntelligence(m)
    for previous,current in zip(m.events,m.events[1:]):
        assert previous.target_id==current.player_id
        assert previous.time<=current.release_time
    for i in engine.insights:
        assert not engine.snapshot(i['confirmed_at']-.001)['insights'] or all(
            x['confirmed_at']<i['confirmed_at'] for x in engine.snapshot(i['confirmed_at']-.001)['insights'])


def test_api_uses_prebuilt_index(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    def fail(*args): raise AssertionError('Index rebuilt per request')
    monkeypatch.setattr(MatchIntelligence,'__init__',fail)
    response=TestClient(app).get('/api/analysis?at=9&player_id=7')
    assert response.status_code==200
    assert response.json()['insights'][0]['id']=='escape-e2'


def test_scenario_isolation_and_explanation(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    client=TestClient(app)
    monkeypatch.setenv('AI_ENABLED','false')
    assert len(client.get('/api/analysis?at=60&scenario=variation').json()['insights'])==2
    assert client.get('/api/analysis?at=60&scenario=control').json()['insights']==[]
    assert client.get('/api/analysis?scenario=missing').status_code==422
    assert 'sequences' not in client.get('/api/match').json()
    response=client.post('/api/explain',json=dict(at=9,player_id=7,question='pressing',language='en'))
    assert response.json()['event_ids']==['e2']
    response=client.post('/api/explain',json=dict(at=9,player_id=7,question='pressing',scenario='control',language='de'))
    assert response.json()['event_ids']==[]
    assert 'kein Pressingdurchbruch' in response.json()['text']
