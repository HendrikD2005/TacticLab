"""Deterministic synthetic fixture. No real club, player or match data."""
import numpy as np
from .models import Match, Player, Event, Sequence

HOME = [(7,34),(25,12),(22,27),(23,46),(28,59),(40,29),(50,9),(45,43),(76,32),(60,27),(65,58)]
AWAY = [(98,34),(80,10),(85,26),(84,44),(78,59),(65,20),(65,45),(56,33),(39,19),(38,47),(31,33)]
NAMES = ['Jonas Falk','Theo Wolf','Noah Lind','Mats Kern','Leon West','Finn Roth','Luis Brand','Elias Berg','Mika Sturm','Paul Adler','Nils Beck','Alex Reed','Sam Cole','Ben Gray','Max Hill','Tom Lane','Jack Wood','Will Ford','Leo Shaw','Joe Hartley','Dan Ellis','Kai Wells']
NUMBERS = [1,2,4,5,3,6,7,8,9,10,11]

def generate_match(seed: int = 42) -> Match:
    rng = np.random.default_rng(seed)
    phase = rng.uniform(-.2, .2, 22)
    times = np.arange(0, 120.01, .5)
    base = np.asarray(HOME + AWAY, dtype=float)
    positions = np.empty((len(times), 22, 2))
    for k, t in enumerate(times):
        positions[k,:,0] = base[:,0] + np.sin(t*.12 + np.arange(22)*.7 + phase)*3
        positions[k,:,1] = base[:,1] + np.cos(t*.1 + np.arange(22) + phase)*2
    players = [Player(id=i,number=NUMBERS[i%11],name=name,team='home' if i<11 else 'away',role='Torwart' if i%11==0 else 'Abwehr' if i%11<5 else 'Mittelfeld' if i%11<8 else 'Angriff') for i,name in enumerate(NAMES)]
    # completion times; every pass has a two-second flight in the replay
    routes = [(8,2,5,True,'s1'),(14,5,7,True,'s1'),(20,7,9,True,'s1'),(28,9,8,True,'s1'),(40,3,7,True,'s2'),(46,7,10,True,'s2'),(52,10,4,False,'s2'),(66,2,7,True,'s3'),(72,7,9,True,'s3'),(78,9,8,True,'s3'),(94,4,5,True,'s4'),(100,5,7,True,'s4'),(106,7,9,True,'s4'),(112,9,8,True,'s4')]
    events=[]
    for k,(t,p,target,success,seq) in enumerate(routes):
        start=positions[int((t-2)*2),p];end=positions[int(t*2),target]
        if not success: end=positions[int(t*2),17]
        nearest=np.linalg.norm(positions[int((t-2)*2),11:]-start,axis=1).min()
        events.append(Event(id=f'e{k+1}',time=t,type='pass',player_id=p,target_id=target if success else 17,x=round(float(start[0]),3),y=round(float(start[1]),3),end_x=round(float(end[0]),3),end_y=round(float(end[1]),3),success=success,under_pressure=bool(nearest<=12),sequence_id=seq))
    sequences=[Sequence(id='s1',start=6,end=28,title='Durch die Mitte',outcome='escape'),Sequence(id='s2',start=38,end=52,title='Am Flügel isoliert',outcome='turnover'),Sequence(id='s3',start=64,end=78,title='Dritter Spieler',outcome='escape'),Sequence(id='s4',start=92,end=112,title='Seite verlagert',outcome='escape')]
    balls=[]
    for k,t in enumerate(times):
        previous=[e for e in events if e.time<=t]
        upcoming=next((e for e in events if e.time>t),None)
        holder=previous[-1].target_id if previous else 2
        if upcoming and upcoming.time-2<=t:
            f=(t-(upcoming.time-2))/2
            ball=np.asarray([upcoming.x,upcoming.y])*(1-f)+np.asarray([upcoming.end_x,upcoming.end_y])*f
        else:
            if upcoming and upcoming.time-4<=t: holder=upcoming.player_id
            ball=positions[k,holder]+[.5,-1]
        balls.append(np.round(ball,3).tolist())
    return Match(id='northbridge-riverside',name='Northbridge – Riverside',duration=120,start_minute=62,sample_hz=2,players=players,times=times.tolist(),positions=np.round(positions,3).tolist(),ball=balls,events=events,sequences=sequences)
