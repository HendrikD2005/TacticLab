from pathlib import Path
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from .data import generate_match
from .analysis import snapshot
from .ai import configured, explain
from .models import AnalysisRequest

ROOT=Path(__file__).resolve().parents[2]
load_dotenv(ROOT/'.env')
app=FastAPI(title='Tactical Lab API',version='0.1.0')
match=generate_match()

@app.get('/api/health')
def health(): return {'status':'ok','ai_enabled':configured(),'data':'synthetic'}

@app.get('/api/match')
def get_match(): return match

@app.get('/api/analysis')
def get_analysis(at: float=Query(0,ge=0,le=60),player_id: int=Query(7,ge=0,le=21)):
    return snapshot(match,at,player_id)

@app.post('/api/explain')
async def get_explanation(request: AnalysisRequest): return await explain(match,request)

DIST=ROOT/'frontend'/'dist'
if DIST.exists():
    app.mount('/assets',StaticFiles(directory=DIST/'assets'),name='assets')
    @app.get('/')
    def index(): return FileResponse(DIST/'index.html')

