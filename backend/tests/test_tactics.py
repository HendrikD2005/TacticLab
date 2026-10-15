from copy import deepcopy
import pytest
from app.models import Event, Match, Player
from app.intelligence import MatchIntelligence
from app.data import generate_tactical_match


def fixture(kind,mirror=False):
    players=[Player(id=i,number=i+1,name=f'Player {i}',team='home' if i<11 else 'away',role='midfielder') for i in range(22)]
    frame=[[5,5] for _ in players]
    for i in range(11,22): frame[i]=[100,5]
    if kind=='switch_of_play':
        frame[2]=[30,8];frame[5]=[45,58];frame[11]=[60,58]
    else:
        frame[2]=[35,34];frame[5]=[55,34];frame[6]=[56,40];frame[7]=[60,30];frame[11]=[64,34];frame[12]=[64,40]
    a,b=frame[2],frame[5]
    event=Event(id='unlabelled',time=2,release_time=1,type='pass',player_id=2,target_id=5,x=a[0],y=a[1],end_x=b[0],end_y=b[1],success=True,under_pressure=False,sequence_id=None)
    if mirror:
        frame=[[105-x,68-y] for x,y in frame]
        for p in players:p.team='away' if p.team=='home' else 'home'
        event.x,event.y=105-event.x,68-event.y;event.end_x,event.end_y=105-event.end_x,68-event.end_y
    return Match(id='independent',name='Independent fixture',duration=8,start_minute=0,sample_hz=4,initial_player_id=2,players=players,times=[i/4 for i in range(33)],positions=[deepcopy(frame) for _ in range(33)],ball=[frame[2]]*33,events=[event])


def findings(match,kind):return [i for i in MatchIntelligence(match).insights if i['kind']==kind]


@pytest.mark.parametrize('kind',['switch_of_play','local_overload'])
@pytest.mark.parametrize('mirror',[False,True])
def test_independent_geometry_confirmation_rewind_and_mirroring(kind,mirror):
    m=fixture(kind,mirror);engine=MatchIntelligence(m)
    assert not engine.snapshot(3.999)['insights']
    finding,=[i for i in engine.snapshot(4)['insights'] if i['kind']==kind]
    assert finding['event_ids']==['unlabelled']
    assert finding['team']==('away' if mirror else 'home')
    assert not engine.snapshot(1)['insights']
    if kind=='switch_of_play':
        assert finding['evidence']['width_m']==50
        assert finding['overlay']['end']==[m.events[0].end_x,m.events[0].end_y]
    else:
        assert finding['evidence']['attackers']==3 and finding['evidence']['defenders']==2
        assert {p['id'] for p in finding['overlay']['members']}=={5,6,7,11,12}
        assert finding['overlay']['at']==4


@pytest.mark.parametrize('reason',['same_flank','too_narrow','backwards','no_space','lost','unconfirmed'])
def test_switch_counterexamples(reason):
    m=fixture('switch_of_play');e=m.events[0]
    if reason=='same_flank':e.y=25;e.end_y=62
    if reason=='too_narrow':e.y=20;e.end_y=48
    if reason=='backwards':e.end_x=e.x-11
    if reason=='no_space':
        for frame in m.positions:frame[11]=[46,58]
    if reason=='lost':
        m.events.append(Event(id='loss',time=3,release_time=2.5,type='pass',player_id=5,target_id=11,x=45,y=58,end_x=60,end_y=58,success=False,under_pressure=False,sequence_id=None))
    if reason=='unconfirmed':m.duration=3
    assert findings(m,'switch_of_play')==[]


@pytest.mark.parametrize('reason',['equal_numbers','only_two','no_defenders','brief_advantage','carrier_leaves','flight','loss_regain','short_match'])
def test_overload_counterexamples(reason):
    m=fixture('local_overload')
    if reason=='equal_numbers':
        for f in m.positions:f[13]=[55,36]
    if reason=='only_two':
        for f in m.positions:f[7]=[5,5];f[12]=[100,5]
    if reason=='no_defenders':
        for f in m.positions:f[11]=f[12]=[100,5]
    if reason=='brief_advantage':m.positions[11][7]=[5,5]  # 2.75 s dip, despite positive start/end
    if reason=='carrier_leaves':m.positions[11][5]=[80,34]
    if reason=='flight':
        m.events.append(Event(id='next',time=5,release_time=2.5,type='pass',player_id=5,target_id=6,x=55,y=34,end_x=56,end_y=40,success=True,under_pressure=False,sequence_id=None))
    if reason=='loss_regain':
        m.events.extend([Event(id='loss',time=2.85,release_time=2.8,type='pass',player_id=5,target_id=11,x=55,y=34,end_x=64,end_y=34,success=False,under_pressure=False,sequence_id=None),Event(id='regain',time=2.95,release_time=2.9,type='pass',player_id=11,target_id=5,x=64,y=34,end_x=55,end_y=34,success=False,under_pressure=False,sequence_id=None)])
    if reason=='short_match':m.duration=3
    assert not any(i['id']=='overload-unlabelled' for i in findings(m,'local_overload'))


def test_future_tracking_cannot_change_a_confirmed_finding():
    m=fixture('local_overload');before=findings(m,'local_overload')
    for k,t in enumerate(m.times):
        if t>4:m.positions[k]=[[100,68] for _ in m.players]
    assert findings(m,'local_overload')==before


def test_annotations_are_ignored_and_duplicate_zones_suppressed():
    m=generate_tactical_match();original=MatchIntelligence(m).insights
    for e in m.events:e.sequence_id='arbitrary';e.under_pressure=not e.under_pressure
    assert MatchIntelligence(m).insights==original
    assert 'overload-e4' not in [i['id'] for i in original]
    assert {'switch_of_play','local_overload'} <= {i['kind'] for i in original}


def test_new_scenario_api_localization_and_prebuilt_index(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app,engines
    client=TestClient(app)
    def fail(*args):raise AssertionError('Rebuilt on request')
    monkeypatch.setattr(MatchIntelligence,'__init__',fail)
    original=deepcopy(engines['tactics'].insights)
    en=client.get('/api/analysis?scenario=tactics&at=18').json()
    de=client.get('/api/analysis?scenario=tactics&at=18&language=de').json()
    assert [i['title'] for i in en['insights']]==['Switch of play','Local overload']
    assert [i['title'] for i in de['insights']]==['Spielverlagerung','Lokale Überzahl']
    assert de['insights'][1]['evidence']==en['insights'][1]['evidence']
    assert engines['tactics'].insights==original
    assert client.get('/api/analysis?scenario=tactics&at=10.99').json()['insights']==[]
    assert client.post('/api/live',json={'scenario':'tactics'}).status_code==200
    # Pressing assistant must not accidentally describe another tactical kind.
    monkeypatch.setenv('AI_ENABLED','false')
    answer=client.post('/api/explain',json={'scenario':'tactics','at':18,'player_id':5,'question':'pressing'}).json()
    assert answer['event_ids']==[]

def test_live_boundaries_for_both_new_patterns(monkeypatch):
    from fastapi.testclient import TestClient
    import app.main as main
    from app.live import LiveSessions
    clock=[100.0]
    monkeypatch.setattr(main,'live_sessions',LiveSessions(main.matches,clock=lambda:clock[0]))
    client=TestClient(main.app)
    session=client.post('/api/live',json={'scenario':'tactics'}).json()['session_id']
    url=f'/api/analysis?scenario=tactics&at=60&session_id={session}'
    assert client.get(url).json()['insights']==[]
    clock[0]=111
    assert [i['kind'] for i in client.get(url).json()['insights']]==['switch_of_play']
    clock[0]=117.9
    assert len(client.get(url).json()['insights'])==1
    clock[0]=118
    assert [i['kind'] for i in client.get(url).json()['insights']]==['switch_of_play','local_overload']
    assert client.get(f'/api/analysis?scenario=tactics&at=10&session_id={session}').json()['insights']==[]


def test_tactical_fixture_is_reproducible_with_bounded_motion():
    import numpy as np
    match=generate_tactical_match()
    assert match.model_dump()==generate_tactical_match().model_dump()
    positions=np.asarray(match.positions)
    speed=np.linalg.norm(np.diff(positions,axis=0),axis=2)*match.sample_hz
    assert speed.max()<6.6
    ball_speed=np.linalg.norm(np.diff(np.asarray(match.ball),axis=0),axis=1)*match.sample_hz
    assert ball_speed.max()<22
    assert all(a.target_id==b.player_id and a.time<=b.release_time for a,b in zip(match.events,match.events[1:]))


@pytest.mark.parametrize('kind',['switch_of_play','local_overload'])
def test_off_grid_confirmation_waits_for_observed_tracking(kind):
    match=fixture(kind)
    match.events[0].time=2.1
    engine=MatchIntelligence(match)
    assert not engine.snapshot(4.1)['insights']
    finding,=[i for i in engine.snapshot(4.25)['insights'] if i['kind']==kind]
    assert finding['evidence']['retained_s']==2.15
    for k,at in enumerate(match.times):
        if at>4.25:match.positions[k]=[[100,68] for _ in match.players]
    assert finding in MatchIntelligence(match).snapshot(4.25)['insights']
