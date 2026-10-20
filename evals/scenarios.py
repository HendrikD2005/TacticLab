"""Hand-labelled geometric cases, independent of the four application replays.

These small synthetic examples check the detector's documented rule, not its
accuracy on real football. Expected labels are specified here, never inferred
from the detector output.
"""
from copy import deepcopy
from app.models import Event, Match, Player


def scenario(kind, *, mirror=False, width=48, space=18, gain=18, variant=""):
    players = [Player(id=i,number=i+1,name=f"Evaluation {i}",
                      team="home" if i<11 else "away",role="midfielder") for i in range(22)]
    frame = [[6.,6.] if i<11 else [101.,6.] for i in range(22)]
    if kind == "switch_of_play":
        origin_y = 20. if width < 40 else 10.
        frame[2],frame[5] = [28.,origin_y], [28.+gain,origin_y+width]
        frame[11] = [28.+gain+space,origin_y+width]
        if variant == "same_flank":
            frame[2],frame[5],frame[11] = [28.,25.],[46.,63.],[64.,63.]
    else:
        frame[2],frame[5],frame[6],frame[7] = [30.,36.],[61.,36.],[66.,41.],[58.,31.]
        frame[11],frame[12] = [70.,36.],[69.,42.]
        if variant == "equal_numbers":
            frame[13] = [66.,36.]
        if variant == "no_defenders":
            frame[11] = frame[12] = [101.,6.]
    a,b = frame[2],frame[5]
    event = Event(id="eval-pass",time=2,release_time=1,type="pass",player_id=2,target_id=5,
                  x=a[0],y=a[1],end_x=b[0],end_y=b[1],success=True,under_pressure=False)
    if mirror:
        frame = [[105-x,68-y] for x,y in frame]
        for player in players:
            player.team = "away" if player.team == "home" else "home"
        event.x,event.y = 105-event.x,68-event.y
        event.end_x,event.end_y = 105-event.end_x,68-event.end_y
    times = [i/4 for i in range(33)]
    positions = [deepcopy(frame) for _ in times]
    if variant == "brief_advantage":
        positions[11][7] = [100.,6.] if not mirror else [5.,62.]
    return Match(id="evaluation",name="Independent evaluation scene",duration=8,
                 start_minute=0,sample_hz=4,initial_player_id=2,players=players,
                 times=times,positions=positions,
                 ball=[frame[2] if at<2 else frame[5] for at in times],events=[event])


def cases():
    for kind in ("switch_of_play","local_overload"):
        for mirror in (False,True):
            match = scenario(kind,mirror=mirror)
            for at,expected in ((3.99,False),(4.,True)):
                yield dict(id=f"{kind}-{'away' if mirror else 'home'}-{at}",
                           match=match,kind=kind,at=at,expected=expected)
    for label,kwargs,expected in [
        ("width-boundary",dict(width=34),True),
        ("width-below",dict(width=33.9),False),
        ("space-boundary",dict(space=8),True),
        ("space-below",dict(space=7.9),False),
        ("backward-boundary",dict(gain=-10),True),
        ("backward-below",dict(gain=-10.1),False),
        ("same-flank",dict(variant="same_flank"),False),
    ]:
        yield dict(id=label,match=scenario("switch_of_play",**kwargs),
                   kind="switch_of_play",at=4.,expected=expected)
    for variant in ("equal_numbers","no_defenders","brief_advantage"):
        yield dict(id=variant,match=scenario("local_overload",variant=variant),
                   kind="local_overload",at=4.,expected=False)
