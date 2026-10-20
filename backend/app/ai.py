"""Microsoft Foundry agent entry point; disabled deployments use local analysis."""
from .assistant import answer
from .foundry import configuration, run_agent
from .intelligence import MatchIntelligence
from .models import AnalysisRequest, Match


def configured() -> bool:
    return configuration().ready


async def explain(match: Match, request: AnalysisRequest, intelligence: MatchIntelligence | None = None) -> dict:
    engine = intelligence or MatchIntelligence(match)
    result, _, _ = answer(match, request, engine)
    return await run_agent(match, request, engine, result)
