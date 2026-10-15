"""Opt-in Azure adapter; no key or AI_ENABLED=false means no outgoing requests."""
import asyncio
import os
import time
from collections import deque
import httpx
from .analysis import snapshot
from .models import AnalysisRequest, Match

calls: deque[float] = deque()
lock=asyncio.Lock()

def configured() -> bool:
    return os.getenv('AI_ENABLED','false').lower()=='true' and all(os.getenv(k) for k in ['AZURE_AI_BASE_URL','AZURE_AI_API_KEY','AZURE_AI_DEPLOYMENT'])

async def explain(match: Match, request: AnalysisRequest) -> dict:
    facts=snapshot(match,request.at,request.player_id)
    player=match.players[request.player_id]
    m=facts['player'] if request.question=='player' else facts['team']
    if request.language=='de':
        text=f"Bis {62+int(request.at)//60}:{int(request.at)%60:02d} wurden {m['completed']} von {m['attempts']} Pässen abgeschlossen. {m['progressive']} erfolgreiche Pässe gewannen mindestens zehn Meter in Angriffsrichtung. Unter Druck kamen {m['pressure_completed']} von {m['pressure_attempts']} Pässen an."
    else:
        text=f"Up to this point, {m['completed']} of {m['attempts']} passes were completed. {m['progressive']} successful passes advanced at least ten metres. Under pressure, {m['pressure_completed']} of {m['pressure_attempts']} passes were completed."
    result={'source':'deterministic','text':text,'event_ids':m['event_ids'],'at':request.at,'player_id':request.player_id}
    if request.question=='compare':
        a,b=facts['comparison']
        result['text']=(f"Erste Hälfte: {a['completed']}/{a['attempts']} Pässe, {a['progressive']} progressiv. Zweite Hälfte: {b['completed']}/{b['attempts']} Pässe, {b['progressive']} progressiv. Kleine synthetische Stichprobe; keine Aussage über taktische Kausalität." if request.language=='de' else f"First half: {a['completed']}/{a['attempts']} passes, {a['progressive']} progressive. Second half: {b['completed']}/{b['attempts']} passes, {b['progressive']} progressive. Small synthetic sample; this does not establish tactical causality.")
    if not configured(): return result
    async with lock:
        now=time.monotonic()
        while calls and calls[0]<now-3600: calls.popleft()
        if len(calls)>=int(os.getenv('AI_MAX_CALLS_PER_HOUR','20')): return {**result,'notice':'AI hourly request limit reached. Showing calculated facts.'}
        calls.append(now)
    base=os.environ['AZURE_AI_BASE_URL'].rstrip('/')
    if not base.startswith('https://'): return {**result,'notice':'Azure endpoint must use HTTPS.'}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response=await client.post(base+'/chat/completions',headers={'api-key':os.environ['AZURE_AI_API_KEY']},json={'model':os.environ['AZURE_AI_DEPLOYMENT'],'messages':[{'role':'system','content':f'Explain only the supplied calculated football facts in {request.language}. Do not invent facts, causal claims, opponents or events. Mention small samples. Be concise. This is synthetic data.'},{'role':'user','content':f'Question: {request.question}. Selected player: {player.name}. Facts: {facts}'}],'max_completion_tokens':450})
            response.raise_for_status()
            text=response.json()['choices'][0]['message']['content']
            if not isinstance(text,str) or not text.strip(): raise ValueError('Empty answer')
            return {**result,'source':'azure','text':text}
    except (httpx.HTTPError,KeyError,ValueError,TypeError,IndexError):
        return {**result,'notice':'Azure unavailable. Showing calculated facts.'}
