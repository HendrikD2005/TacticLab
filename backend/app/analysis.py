from math import hypot
from .models import Match

def metrics(match: Match, at: float, player_id: int | None = None, start: float = 0) -> dict:
    """Only completed events in [start, at]; null percentages mean no attempts."""
    events=[e for e in match.events if start<=e.time<=at and (player_id is None or e.player_id==player_id)]
    passes=[e for e in events if e.type=='pass']
    completed=[e for e in passes if e.success]
    pressured=[e for e in passes if e.under_pressure]
    progressive=[e for e in completed if (e.end_x-e.x)*(1 if match.players[e.player_id].team=='home' else -1)>=10]
    return {'attempts':len(passes),'completed':len(completed),'accuracy':round(100*len(completed)/len(passes)) if passes else None,'progressive':len(progressive),'pressure_attempts':len(pressured),'pressure_completed':sum(e.success for e in pressured),'forward':sum((e.end_x-e.x)*(1 if match.players[e.player_id].team=='home' else -1)>0 for e in passes),'distance_m':round(sum(hypot(e.end_x-e.x,e.end_y-e.y) for e in completed),1),'event_ids':[e.id for e in events]}

def snapshot(match: Match, at: float, player_id: int) -> dict:
    visible=[s for s in match.sequences if s.end<=at]
    split=at/2
    return {'at':at,'player_id':player_id,'player':metrics(match,at,player_id),'team':metrics(match,at),'sequences':[s.model_dump() for s in visible],'comparison':[{'label':'Erste Hälfte',**metrics(match,max(0,split-.0001))},{'label':'Zweite Hälfte',**metrics(match,at,start=split)}]}
