from pathlib import Path
from typing import Literal
from fastapi import FastAPI, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from .data import generate_match
from .analysis import snapshot
from .intelligence import MatchIntelligence
from .ai import configured, explain
from .i18n import Language
from .models import AnalysisRequest

ROOT=Path(__file__).resolve().parents[2]
load_dotenv(ROOT/'.env')
app=FastAPI(title='TacticLab API',version='0.1.0')
Scenario = Literal['standard', 'variation', 'control']
SCENARIO_SEEDS = {'standard':42, 'variation':2026, 'control':7}
matches = {key:generate_match(seed).model_copy(update={'scenario':key}) for key,seed in SCENARIO_SEEDS.items()}
engines = {key:MatchIntelligence(value) for key,value in matches.items()}
match, intelligence = matches['standard'], engines['standard']

@app.get('/api/health')
def health(): return {'status':'ok','ai_enabled':configured(),'data':'synthetic'}

@app.get('/api/match')
def get_match(scenario: Scenario = 'standard'): return matches[scenario]

@app.get('/api/analysis')
def get_analysis(at: float=Query(0,ge=0,le=60),player_id: int=Query(7,ge=0,le=21), scenario: Scenario = 'standard', language: Language = 'en'):
    return snapshot(matches[scenario],at,player_id,engines[scenario],language)

@app.post('/api/explain')
async def get_explanation(request: AnalysisRequest): return await explain(matches[request.scenario],request,engines[request.scenario])

DIST=ROOT/'frontend'/'dist'
if DIST.exists():
    app.mount('/assets',StaticFiles(directory=DIST/'assets'),name='assets')
    @app.get('/')
    def index(): return FileResponse(DIST/'index.html')

