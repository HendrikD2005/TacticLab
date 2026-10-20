"""Offline, repeatable synthetic evaluation. Never sends a model request."""
from pathlib import Path
import argparse
from copy import deepcopy
from datetime import datetime, timezone
import json
import os
import statistics
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT/"backend"), str(ROOT)]
os.environ["AI_ENABLED"] = "false"
from app.assistant import answer
from app.intelligence import MatchIntelligence
from app.main import matches, engines
from app.models import AnalysisRequest
from app.recaps import build_recap
from evals.scenarios import cases


def evaluate():
    failures,latencies = [],[]
    matrix = dict(true_positive=0,true_negative=0,false_positive=0,false_negative=0)
    for case in cases():
        started = time.perf_counter()
        result = MatchIntelligence(case["match"]).snapshot(case["at"])["insights"]
        latencies.append((time.perf_counter()-started)*1000)
        observed = any(i["kind"] == case["kind"] for i in result)
        key = ("true" if observed == case["expected"] else "false") + ("_positive" if observed else "_negative")
        matrix[key] += 1
        if observed != case["expected"]:
            failures.append({"case":case["id"],"expected":case["expected"],"actual":observed})

    route_cases = json.loads((ROOT/"evals"/"questions.json").read_text(encoding="utf-8"))
    accepted = 0
    for case in route_cases:
        req = AnalysisRequest(scenario="tactics",at=18,player_id=7,query=case["query"],language=case["language"])
        result = answer(matches["tactics"],req,engines["tactics"])[0]
        okay = result["unsupported"] == case["unsupported"]
        for field in ("scope_type","player_id","topic"):
            if field in case:
                okay = okay and result[field] == case[field]
        accepted += okay
        if not okay:
            failures.append({"case":case["query"],"expected":case,"actual":{k:result[k] for k in ("unsupported","topic","scope_type","player_id")}})

    grounding = dict(responses=0,future_evidence_leaks=0,unknown_evidence_ids=0,
                     lost_selected_scenes=0,future_tracking_changes=0)
    for scenario,match in matches.items():
        for at in (0,10,18,60):
            for language in ("en","de"):
                for mode in ("analyst","fan"):
                    req = AnalysisRequest(scenario=scenario,at=at,player_id=1,question="recap",language=language,mode=mode)
                    result = build_recap(match,req,engines[scenario])
                    grounding["responses"] += 1
                    ids = {e.id for e in match.events if e.time <= at}
                    grounding["future_evidence_leaks"] += sum(s["at"]>at for s in result["scenes"])
                    grounding["future_evidence_leaks"] += sum(c["at"]>at for c in result["claims"])
                    grounding["unknown_evidence_ids"] += len(set(result["event_ids"])-ids)
                    scene_ids = {s["insight_id"] for s in result["scenes"]}
                    grounding["lost_selected_scenes"] += sum(c["id"][8:] not in scene_ids for c in result["claims"] if c["id"].startswith("pattern:"))
        altered = deepcopy(match)
        for i,at in enumerate(altered.times):
            if at>18:
                altered.positions[i]=[[0.,0.] for _ in altered.players]
        req=AnalysisRequest(scenario=scenario,at=18,player_id=1,question="recap")
        before=build_recap(match,req,engines[scenario])
        after=build_recap(altered,req,MatchIntelligence(altered))
        grounding["future_tracking_changes"] += before != after
    if any(value for key,value in grounding.items() if key != "responses"):
        failures.append({"case":"grounding","actual":grounding})
    tp,fp,fn=matrix["true_positive"],matrix["false_positive"],matrix["false_negative"]
    return {
        "generated_at":datetime.now(timezone.utc).isoformat(),"mode":"offline_synthetic",
        "scope":"Regression evaluation, not real-match accuracy or model quality",
        "detection":{**matrix,"cases":sum(matrix.values()),"precision":tp/(tp+fp) if tp+fp else None,
                     "recall":tp/(tp+fn) if tp+fn else None},
        "routing":{"cases":len(route_cases),"passed":accepted},
        "grounding":grounding,
        "local_index_and_snapshot_ms":{"median":round(statistics.median(latencies),3),
                                       "p95":round(sorted(latencies)[int(.95*(len(latencies)-1))],3)},
        "foundry_live_verified":False,"cloud_latency_ms":None,"model_cost":None,
        "failures":failures,"passed":not failures,
    }


if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",type=Path,default=ROOT/"artifacts"/"evaluation.json")
    args=parser.parse_args()
    result=evaluate()
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(result,ensure_ascii=False,indent=2))
    raise SystemExit(0 if result["passed"] else 1)
