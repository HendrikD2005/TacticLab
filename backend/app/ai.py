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
    from .assistant import answer
    result, facts, player = answer(match, request, intelligence)
    language=request.language
    if result['unsupported']: return result
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
            response=await client.post(base+'/chat/completions',headers={'api-key':os.environ['AZURE_AI_API_KEY']},json={'model':os.environ['AZURE_AI_DEPLOYMENT'],'messages':[{'role':'system','content':f'Explain only the supplied calculated football facts in {request.language}. Do not invent facts, causal claims, opponents or events. Mention small samples. Be concise. Audience mode: {request.mode}; in fan mode use short everyday sentences and explain football terms. This is synthetic data.'},{'role':'user','content':f'Question: {result['topic']}. Selected player: {player.name}. Evidence-grounded answer: {result['text']}. Facts: {facts}'}],'max_completion_tokens':450})
            response.raise_for_status()
            text=response.json()['choices'][0]['message']['content']
            if not isinstance(text,str) or not text.strip(): raise ValueError('Empty answer')
            return {**result,'source':'azure','text':text}
    except (httpx.HTTPError,KeyError,ValueError,TypeError,IndexError):
        return {**result,'notice':translate('notice.unavailable',language)}
