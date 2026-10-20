from pathlib import Path
from typing import Literal
from uuid import UUID
from fastapi import FastAPI, Query, Request, Header, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from .data import generate_match, generate_tactical_match
from .analysis import snapshot
from .recaps import build_recap
from .intelligence import MatchIntelligence
from .ai import configured, explain
from .foundry import status as ai_status
from .i18n import Language
from .models import AnalysisRequest, LiveRequest
from .live import LiveSessions

ROOT=Path(__file__).resolve().parents[2]
load_dotenv(ROOT/'.env')
app=FastAPI(title='TacticLab API',version='0.1.0')
Scenario = Literal['standard', 'variation', 'control', 'tactics']
SCENARIO_SEEDS = {'standard':42, 'variation':2026, 'control':7}
matches = {key:generate_match(seed).model_copy(update={'scenario':key}) for key,seed in SCENARIO_SEEDS.items()}
matches['tactics'] = generate_tactical_match()
engines = {key:MatchIntelligence(value) for key,value in matches.items()}
match, intelligence = matches['standard'], engines['standard']
live_sessions = LiveSessions(matches)

@app.get('/api/health')
def health(): return {'status':'ok','ai_enabled':configured(),'data':'synthetic','ai':ai_status()}

@app.get('/api/match')
def get_match(scenario: Scenario = 'standard'): return matches[scenario]

@app.get('/api/analysis')
def get_analysis(at: float=Query(0,ge=0,le=60),player_id: int=Query(7,ge=0,le=21), scenario: Scenario = 'standard', language: Language = 'en', session_id: UUID | None = None, mode: Literal['analyst','fan'] = 'analyst'):
    session_key = str(session_id) if session_id else None
    at = live_sessions.limit(session_key, scenario, at)
    facts = snapshot(matches[scenario],at,player_id,engines[scenario],language)
    request = AnalysisRequest(at=at,player_id=player_id,scenario=scenario,language=language,mode=mode,question='recap')
    recap = {**build_recap(matches[scenario],request,engines[scenario],facts=facts),'session_id':session_key}
    return {**facts, 'mode':mode, 'recap':recap, 'session_id':session_key}

@app.post('/api/explain')
async def get_explanation(request: AnalysisRequest):
    session_key = str(request.session_id) if request.session_id else None
    at = live_sessions.limit(session_key, request.scenario, request.at)
    bounded = request.model_copy(update={'at':at})
    return {**await explain(matches[request.scenario],bounded,engines[request.scenario]), 'session_id':session_key}

@app.post('/api/live')
def create_live(request: LiveRequest):
    session = live_sessions.create(request.session_id, request.scenario)
    return {'session_id':session.id, 'match':session.source.metadata}

@app.get('/api/live/{session_id}/events')
def live_events(session_id: UUID, request: Request, after: int = Query(0,ge=0),
                last_event_id: str | None = Header(None)):
    headers = {'Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'}
    try:
        session = live_sessions.get(str(session_id))
    except HTTPException as error:
        if error.status_code != 410:
            raise
        return StreamingResponse(iter(['event: expired\ndata: {}\n\n']), media_type='text/event-stream', headers=headers)
    cursor = live_sessions.cursor(session, after, last_event_id)
    return StreamingResponse(live_sessions.stream(session,cursor,request), media_type='text/event-stream', headers=headers)

DIST=ROOT/'frontend'/'dist'
if DIST.exists():
    app.mount('/assets',StaticFiles(directory=DIST/'assets'),name='assets')
    @app.get('/')
    def index(): return FileResponse(DIST/'index.html')

