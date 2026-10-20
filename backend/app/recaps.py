"""Short reports built from the same bounded claims used by Foundry tools."""
from .evidence import EvidenceTools, render_selection
from .i18n import text as tr


def build_recap(match, request, intelligence, facts=None):
    player = match.players[request.player_id]
    scope = tr("assistant.scope", request.language,
               name="Northbridge" if player.team == "home" else "Riverside")
    timestamp = f"{match.start_minute + int(request.at)//60}:{int(request.at)%60:02d}"
    base = dict(source="deterministic", mode=request.mode, at=request.at,
                player_id=player.id, language=request.language, scenario=match.scenario,
                topic="recap", scope=scope, scope_type="team", unsupported=False,
                context=tr("assistant.context", request.language, time=timestamp, scope=scope))
    tools = EvidenceTools(match, request, intelligence, base, facts=facts)
    # Keep the latest finding of each kind, up to two: short, diverse and traceable.
    latest = {claim["kind"]: claim for claim in tools.patterns("all")}
    patterns = sorted(latest.values(), key=lambda c: c["at"], reverse=True)[:2]
    claims = tools.statistics() + patterns
    if not patterns:
        claims.append(dict(id="recap:no-patterns", kind="observation",
                           text=tr("recap.no_patterns", request.language),
                           event_ids=[], scenes=[], at=request.at))
    result = render_selection(base, claims, request.language, request.mode)
    # Place tactical scenes ahead of the statistical sample for direct navigation.
    result["scenes"].sort(key=lambda scene: (scene["insight_id"] is None, -scene["at"]))
    return result
