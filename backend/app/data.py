"""Seeded synthetic tracking with bounded player acceleration and timed passes."""
import numpy as np
from .models import Match, Player, Event

HOME = [(7,34),(25,12),(22,27),(23,46),(28,59),(40,29),(50,9),(45,43),(76,32),(60,27),(65,58)]
AWAY = [(98,34),(80,10),(85,26),(84,44),(78,59),(65,20),(65,45),(56,33),(39,19),(38,47),(31,33)]
NAMES = ['Jonas Falk','Theo Wolf','Noah Lind','Mats Kern','Leon West','Finn Roth','Luis Brand','Elias Berg','Mika Sturm','Paul Adler','Nils Beck','Alex Reed','Sam Cole','Ben Gray','Max Hill','Tom Lane','Jack Wood','Will Ford','Leo Shaw','Joe Hartley','Dan Ellis','Kai Wells']
NUMBERS = [1,2,4,5,3,6,7,8,9,10,11]
SAMPLE_HZ=10
DURATION=60
PASS_SPEED=16.0  # illustrative m/s, not calibrated against professional tracking

def generate_match(seed: int = 42) -> Match:
    rng=np.random.default_rng(seed)
    times=np.arange(0,DURATION+1/SAMPLE_HZ/2,1/SAMPLE_HZ)
    base=np.asarray(HOME+AWAY,dtype=float)
    positions=np.empty((len(times),22,2)); positions[0]=base
    velocity=np.zeros_like(base)
    target=base.copy()
    for k,t in enumerate(times[1:],1):
        if k==1 or k%30==0:
            # Team shifts plus individual support runs, with a conservative goalkeeper range.
            shift=np.array([6*np.sin(t*.23),5*np.sin(t*.31)])
            target=base+shift+rng.uniform(-8,8,(22,2))
            target[[0,11]]=base[[0,11]]+rng.uniform(-1.5,1.5,(2,2))
            target[:,0]=np.clip(target[:,0],8,97);target[:,1]=np.clip(target[:,1],8,60)
        delta=target-positions[k-1]
        distance=np.linalg.norm(delta,axis=1,keepdims=True)
        desired=delta/np.maximum(distance,.001)*np.minimum(distance*1.5,6.5)
        acceleration=(desired-velocity)*3
        acceleration*=np.minimum(1,4/np.maximum(np.linalg.norm(acceleration,axis=1,keepdims=True),.001))
        velocity+=acceleration/SAMPLE_HZ
        positions[k]=positions[k-1]+velocity/SAMPLE_HZ
    players=[Player(id=i,number=NUMBERS[i%11],name=name,team='home' if i<11 else 'away',role='Torwart' if i%11==0 else 'Abwehr' if i%11<5 else 'Mittelfeld' if i%11<8 else 'Angriff') for i,name in enumerate(NAMES)]
    routes=[(4,2,5,True,'s1'),(7,5,7,True,'s1'),(10,7,9,True,'s1'),(14,9,8,True,'s1'),(18,8,3,True,'link1'),(20,3,7,True,'s2'),(23,7,10,True,'s2'),(26,10,4,False,'s2'),(30,17,2,False,'link2'),(33,2,7,True,'s3'),(36,7,9,True,'s3'),(39,9,8,True,'s3'),(44,8,4,True,'link3'),(47,4,5,True,'s4'),(50,5,7,True,'s4'),(53,7,9,True,'s4'),(56,9,8,True,'s4')]
    events=[]
    def at(t,player):
        ix=np.clip(t*SAMPLE_HZ,0,len(times)-1);lo=int(ix);hi=min(lo+1,len(times)-1)
        return positions[lo,player]*(1-(ix-lo))+positions[hi,player]*(ix-lo)
    for k,(t,p,target_id,success,seq) in enumerate(routes):
        receiver=target_id if success or p>=11 else 17
        end=at(t,receiver);duration=1.0
        for _ in range(8):
            start=at(t-duration,p)
            duration=float(np.linalg.norm(end-start)/PASS_SPEED)
        release=round(t-duration,4);start=at(release,p)
        nearest=min(np.linalg.norm(at(release,i)-start) for i in (range(11,22) if p<11 else range(11)))
        if events and release < events[-1].time:
            raise ValueError('Overlapping passes in synthetic fixture')
        events.append(Event(id=f'e{k+1}',time=t,release_time=release,type='pass',player_id=p,target_id=receiver,x=round(float(start[0]),3),y=round(float(start[1]),3),end_x=round(float(end[0]),3),end_y=round(float(end[1]),3),success=success,under_pressure=bool(nearest<=12),sequence_id=seq))
    balls=[]
    for t in times:
        previous=next((e for e in reversed(events) if e.time<=t),None)
        upcoming=next((e for e in events if e.time>t),None)
        if upcoming and upcoming.release_time<=t:
            f=(t-upcoming.release_time)/(upcoming.time-upcoming.release_time)
            ball=np.array([upcoming.x,upcoming.y])*(1-f)+np.array([upcoming.end_x,upcoming.end_y])*f
        elif upcoming:
            holder=previous.target_id if previous else upcoming.player_id
            if holder != upcoming.player_id:
                raise ValueError('Passer must have received the preceding pass')
            ball=at(t,holder)
        else: ball=at(t,previous.target_id)
        balls.append(np.round(ball,3).tolist())
    return Match(id=f'northbridge-riverside-{seed}',name='Northbridge – Riverside',duration=DURATION,initial_player_id=2,start_minute=62,sample_hz=SAMPLE_HZ,players=players,times=np.round(times,3).tolist(),positions=np.round(positions,3).tolist(),ball=balls,events=events)

