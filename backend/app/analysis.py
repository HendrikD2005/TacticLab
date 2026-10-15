from math import hypot
from .models import Match
from .intelligence import MatchIntelligence
from .i18n import Language, text, localize_insight

def metrics(match: Match, at: float, player_id: int | None = None, start: float = 0, team: str | None = None) -> dict:
    """Only completed events in [start, at]; null percentages mean no attempts."""
    events=[e for e in match.events if start<=e.time<=at and (player_id is None or e.player_id==player_id) and (team is None or match.players[e.player_id].team==team)]
    passes=[e for e in events if e.type=='pass']
    completed=[e for e in passes if e.success]
    pressured=[e for e in passes if e.under_pressure]
    progressive=[e for e in completed if (e.end_x-e.x)*(1 if match.players[e.player_id].team=='home' else -1)>=10]
    return {'attempts':len(passes),'completed':len(completed),'accuracy':round(100*len(completed)/len(passes)) if passes else None,'progressive':len(progressive),'pressure_attempts':len(pressured),'pressure_completed':sum(e.success for e in pressured),'forward':sum((e.end_x-e.x)*(1 if match.players[e.player_id].team=='home' else -1)>0 for e in passes),'distance_m':round(sum(hypot(e.end_x-e.x,e.end_y-e.y) for e in completed),1),'event_ids':[e.id for e in events]}

def snapshot(match: Match, at: float, player_id: int, intelligence: MatchIntelligence | None = None, language: Language = 'en') -> dict:
    split=at/2
    team=match.players[player_id].team
    engine=intelligence or MatchIntelligence(match)
    state=engine.snapshot(at)
    state['insights']=[localize_insight(i,engine.players,language) for i in state['insights']]
    return {**state,'language':language,'scenario':match.scenario,'at':at,'player_id':player_id,'player':metrics(match,at,player_id),'team':metrics(match,at,team=team),'comparison':[{'label':text('first_period',language),**metrics(match,max(0,split-.0001),team=team)},{'label':text('second_period',language),**metrics(match,at,start=split,team=team)}]}
