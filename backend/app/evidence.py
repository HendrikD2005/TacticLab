"""Server-owned, replay-bounded claims shared by the agent and short reports.

Models can select these claims, never supply their numerical values or prose.
"""
from .analysis import snapshot
from .i18n import text as tr


def scene_for_event(match, event):
    name = match.players[event.player_id].name
    return dict(
        id=event.id, insight_id=None, at=event.time, start=event.release_time,
        end=event.time, title=name, reason=name, player_id=event.player_id,
        event_ids=[event.id],
    )


def event_claim(match, event, request):
    scene = scene_for_event(match, event)
    if event.type == "pass":
        target = match.players[event.target_id].name if event.target_id is not None else "—"
        description = tr("assistant.pass", request.language, name=scene["title"], target=target,
                         outcome=tr("assistant.success" if event.success else "assistant.failed", request.language))
    else:
        description = tr("assistant.event", request.language, name=scene["title"],
                         kind=tr("assistant." + event.type, request.language))
    scene.update(title=description, reason=description)
    return dict(id="event:" + event.id, kind="event", text=description,
                event_ids=[event.id], scenes=[scene], at=event.time)


def pattern_claim(insight, request, player_id):
    description = insight["summary"] + " " + (
        tr("fan." + insight["kind"], request.language)
        if request.mode == "fan" else insight["explanation"]
    )
    scene = dict(
        id=insight["id"], insight_id=insight["id"], at=insight["confirmed_at"],
        start=insight["start"], end=insight["end"], title=insight["title"],
        reason=description, player_id=player_id, event_ids=insight["event_ids"],
    )
    return dict(id="pattern:" + insight["id"], kind=insight["kind"], text=description,
                event_ids=insight["event_ids"], scenes=[scene], at=insight["confirmed_at"])


class EvidenceTools:
    """One immutable context; the model cannot override time, team or player."""

    def __init__(self, match, request, intelligence, base, facts=None):
        self.match, self.request, self.base = match, request, base
        self.player = match.players[base["player_id"]]
        self.player_scope = base.get("scope_type") == "player"
        self.facts = facts if facts is not None else snapshot(match, request.at, self.player.id, intelligence, request.language)
        self.metrics = self.facts["player"] if self.player_scope else self.facts["team"]
        self.events = [e for e in match.events if e.time <= request.at
                       and (e.player_id == self.player.id if self.player_scope
                            else match.players[e.player_id].team == self.player.team)]
        self.findings = [i for i in self.facts["insights"] if i["team"] == self.player.team
                         and (not self.player_scope or self.player.id in i["player_ids"])]
        self.context = dict(at=request.at, scenario=match.scenario, scope=base["scope"],
                            scope_type=base.get("scope_type", "team"),
                            mode=request.mode, language=request.language, data_source="synthetic")

    def statistics(self):
        req = self.request
        timestamp = f"{self.match.start_minute + int(req.at)//60}:{int(req.at)%60:02d}"
        claim = dict(
            id="statistics:passing", kind="statistics",
            text=self.base["scope"] + ". " + tr("fan.metrics" if req.mode == "fan" else "metrics",
                                               req.language, time=timestamp, **self.metrics),
            event_ids=self.metrics["event_ids"],
            scenes=[event_claim(self.match, e, req)["scenes"][0] for e in [e for e in self.events if e.id in self.metrics["event_ids"]][-4:]],
            at=req.at,
        )
        return [claim]

    def patterns(self, kind):
        req = self.request
        findings = [i for i in self.findings if kind == "all" or i["kind"] == kind]
        claims = [pattern_claim(i, req, self.player.id) for i in findings[-4:]]
        topic = {"pressing_escape": "pressing", "switch_of_play": "switch", "local_overload": "overload"}
        if kind != "all":
            description = (
                tr("assistant.count", req.language, kind=tr("assistant." + topic[kind], req.language),
                   count=len(findings), shown=min(4, len(findings)))
                if findings else tr("assistant.empty", req.language,
                                    kind=tr("assistant." + topic[kind], req.language))
            )
            claims.insert(0, dict(id="count:" + kind, kind=kind, text=description,
                                  event_ids=list(dict.fromkeys(e for i in findings for e in i["event_ids"])),
                                  scenes=[s for claim in claims for s in claim["scenes"]], at=req.at))
        return claims

    def comparison(self):
        first, second = self.facts["comparison"]
        values = {f"{period}_{key}": metric[key] for period, metric in [("first", first), ("second", second)]
                  for key in ["completed", "attempts", "progressive"]}
        team = "Northbridge" if self.player.team == "home" else "Riverside"
        return [dict(id="comparison:periods", kind="comparison",
                     text=tr("assistant.scope", self.request.language, name=team) + ". " +
                          tr("compare", self.request.language, **values),
                     event_ids=first["event_ids"] + second["event_ids"],
                     scenes=[], at=self.request.at)]

    def execute(self, name, arguments):
        """Validate again locally; strict schemas alone are not a trust boundary."""
        if not isinstance(arguments, dict):
            raise ValueError("Tool arguments must be an object")
        if name == "get_passing_statistics" and not arguments:
            claims = self.statistics()
        elif name == "compare_periods" and not arguments:
            claims = self.comparison()
        elif name == "get_tactical_findings" and set(arguments) == {"kind"}:
            if arguments["kind"] not in ("all", "pressing_escape", "switch_of_play", "local_overload"):
                raise ValueError("Unknown tactical kind")
            claims = self.patterns(arguments["kind"])
        elif name == "get_recent_events" and set(arguments) == {"limit"}:
            limit = arguments["limit"]
            if type(limit) is not int or not 1 <= limit <= 6:
                raise ValueError("Invalid event limit")
            claims = [event_claim(self.match, e, self.request) for e in self.events[-limit:]]
        else:
            raise ValueError("Unknown tool or arguments")
        return {"context": self.context, "claims": claims}


def render_selection(base, claims, language, mode):
    scenes = {s["id"]: s for c in claims for s in c["scenes"]}
    return {
        **base,
        "text": " ".join(c["text"] for c in claims) + " " +
                tr("fan.caution" if mode == "fan" else "assistant.sample", language),
        "claims": [{k: v for k, v in c.items() if k != "scenes"} for c in claims],
        "event_ids": list(dict.fromkeys(e for c in claims for e in c["event_ids"])),
        "scenes": list(scenes.values())[:6],
    }
