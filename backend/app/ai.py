"""Microsoft Foundry agent entry point; disabled deployments use local analysis."""
from .assistant import answer
from .recaps import build_recap
from .foundry import configuration, run_agent
from .intelligence import MatchIntelligence
from .models import AnalysisRequest, Match


def configured() -> bool:
    return configuration().ready


async def explain(match: Match, request: AnalysisRequest, intelligence: MatchIntelligence | None = None) -> dict:
    engine = intelligence or MatchIntelligence(match)
    result = build_recap(match, request, engine) if request.question == 'recap' and not request.query.strip() else answer(match, request, engine)[0]
    return await run_agent(match, request, engine, result)
