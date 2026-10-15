"""Transparent single-pass switches and sustained ball-side numerical advantages."""
from math import hypot
from bisect import bisect_left

SWITCH_WIDTH_M = 34.0
WIDE_THIRD_M = 68 / 3
OVERLOAD_RADIUS_M = 15.0
CONFIRM_S = 2.0


def detect_patterns(engine):
    findings = []
    for event in engine.events:
        if event.type != 'pass' or not event.success or event.target_id is None:
            continue
        # Wait for an observed tracking frame: interpolation at an off-grid
        # confirmation time must not borrow the next (still future) sample.
        index = bisect_left(engine.match.times, event.time + CONFIRM_S)
        if index >= len(engine.match.times):
            continue
        confirmed = engine.match.times[index]
        if confirmed > engine.match.duration:
            continue
        held = round(confirmed-event.time, 3)
        received, retained = engine.possession(event.time), engine.possession(confirmed)
        if received['phase_id'] != retained['phase_id'] or retained['status'] != 'controlled':
            continue
        team = engine.players[event.player_id].team
        common = dict(start=event.release_time, end=event.time, confirmed_at=confirmed,
                      team=team, phase_id=received['phase_id'], event_ids=[event.id])
        opponents = [p.id for p in engine.match.players if p.team != team]
        space = min((hypot(x-event.end_x,y-event.end_y) for x,y in (engine.point(event.time,p) for p in opponents)), default=0)
        width = abs(event.end_y-event.y)
        opposite = ((event.y <= WIDE_THIRD_M and event.end_y >= 68-WIDE_THIRD_M)
                    or (event.end_y <= WIDE_THIRD_M and event.y >= 68-WIDE_THIRD_M))
        gain = (event.end_x-event.x)*(1 if team == 'home' else -1)
        if opposite and width >= SWITCH_WIDTH_M and gain >= -10 and space >= 8:
            findings.append(dict(**common, id='switch-'+event.id, kind='switch_of_play',
                player_ids=[event.player_id,event.target_id],
                evidence=dict(width_m=round(width,1),distance_m=round(hypot(event.end_x-event.x,event.end_y-event.y),1),space_after_m=round(space,1),retained_s=held),
                overlay=dict(start=[event.x,event.y],end=[event.end_x,event.end_y],opponents=[])))
        # Fixed receiving zone, sampled at every tracking and possession transition.
        # Checking transitions prevents a brief loss/flight between frames being hidden.
        center = [event.end_x,event.end_y]
        samples = sorted({event.time,confirmed,*[t for t in engine.match.times if event.time<t<confirmed],
                          *[t for t in engine.state_times if event.time<t<confirmed]})
        minimum = 99
        members = []
        for at in samples:
            state = engine.possession(at)
            if state['phase_id'] != received['phase_id'] or state['status'] != 'controlled' or state['player_id'] is None:
                break
            owner = engine.point(at,state['player_id'])
            if hypot(owner[0]-center[0],owner[1]-center[1]) > OVERLOAD_RADIUS_M:
                break
            members = [dict(id=p.id,team=p.team,point=engine.point(at,p.id)) for p in engine.match.players]
            members = [p for p in members if hypot(p['point'][0]-center[0],p['point'][1]-center[1]) <= OVERLOAD_RADIUS_M]
            attackers = sum(p['team']==team for p in members)
            defenders = len(members)-attackers
            if attackers < 3 or defenders < 1 or attackers <= defenders:
                break
            minimum = min(minimum,attackers-defenders)
        else:
            # Suppress repeated detections of the same local advantage in one phase.
            repeated = any(i['kind']=='local_overload' and i['phase_id']==received['phase_id']
                and event.time-i['end']<8 and hypot(i['overlay']['center'][0]-center[0],i['overlay']['center'][1]-center[1])<2*OVERLOAD_RADIUS_M for i in findings)
            if repeated:
                continue
            findings.append(dict(**common,id='overload-'+event.id,kind='local_overload',
                player_ids=[p['id'] for p in members if p['team']==team],
                evidence=dict(attackers=attackers,defenders=defenders,minimum_advantage=minimum,radius_m=OVERLOAD_RADIUS_M,retained_s=held),
                overlay=dict(center=center,radius=OVERLOAD_RADIUS_M,at=confirmed,members=members)))
    return findings
