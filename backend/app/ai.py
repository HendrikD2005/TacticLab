"""Opt-in Azure adapter; no key or AI_ENABLED=false means no outgoing requests."""
import asyncio
import os
import time
from collections import deque
import httpx
from .analysis import snapshot
from .intelligence import MatchIntelligence
from .models import AnalysisRequest, Match
from .i18n import text as translate

calls: deque[float] = deque()
lock=asyncio.Lock()

def configured() -> bool:
    return os.getenv('AI_ENABLED','false').lower()=='true' and all(os.getenv(k) for k in ['AZURE_AI_BASE_URL','AZURE_AI_API_KEY','AZURE_AI_DEPLOYMENT'])

async def explain(match: Match, request: AnalysisRequest, intelligence: MatchIntelligence | None = None) -> dict:
    facts=snapshot(match,request.at,request.player_id,intelligence,request.language)
    player=match.players[request.player_id]
    m=facts['player'] if request.question=='player' else facts['team']
    language=request.language
    timestamp=f'{match.start_minute+int(request.at)//60}:{int(request.at)%60:02d}'
    result={'source':'deterministic','text':translate('metrics',language,time=timestamp,**m),
            'event_ids':m['event_ids'],'at':request.at,'player_id':request.player_id,'language':language}
    if request.question=='compare':
        first,second=facts['comparison']
        result['text']=translate('compare',language,
            **{f'{period}_{key}':values[key] for period,values in [('first',first),('second',second)]
               for key in ['completed','attempts','progressive']})
    if request.question=='pressing':
        findings=[i for i in facts['insights'] if i['team']==player.team and i['kind']=='pressing_escape']
        if findings:
            latest=findings[-1]
            result['text']=latest['explanation']+' '+latest['limitation']
            result['event_ids']=latest['event_ids']
        else:
            result['text']=translate('no_escape',language)
            result['event_ids']=[]
    if not configured(): return result
    async with lock:
        now=time.monotonic()
        while calls and calls[0]<now-3600: calls.popleft()
        if len(calls)>=int(os.getenv('AI_MAX_CALLS_PER_HOUR','20')): return {**result,'notice':translate('notice.limit',language)}
        calls.append(now)
    base=os.environ['AZURE_AI_BASE_URL'].rstrip('/')
    if not base.startswith('https://'): return {**result,'notice':translate('notice.https',language)}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response=await client.post(base+'/chat/completions',headers={'api-key':os.environ['AZURE_AI_API_KEY']},json={'model':os.environ['AZURE_AI_DEPLOYMENT'],'messages':[{'role':'system','content':f'Explain only the supplied calculated football facts in {request.language}. Do not invent facts, causal claims, opponents or events. Mention small samples. Be concise. This is synthetic data.'},{'role':'user','content':f'Question: {request.question}. Selected player: {player.name}. Facts: {facts}'}],'max_completion_tokens':450})
            response.raise_for_status()
            text=response.json()['choices'][0]['message']['content']
            if not isinstance(text,str) or not text.strip(): raise ValueError('Empty answer')
            return {**result,'source':'azure','text':text}
    except (httpx.HTTPError,KeyError,ValueError,TypeError,IndexError):
        return {**result,'notice':translate('notice.unavailable',language)}
