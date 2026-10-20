"""Explicit opt-in smoke test. No remote calls unless --live is supplied."""
import argparse
import asyncio
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.main import matches, engines
from app.foundry import status
from app.ai import explain
from app.models import AnalysisRequest

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--live", action="store_true", help="Make up to four billable model calls.")
args = parser.parse_args()
current = status()
print(json.dumps(current, indent=2))
if not args.live:
    print("Configuration check only. Add --live after configuring .env to test the real deployment.")
    raise SystemExit(0)
if current["status"] != "ready":
    print("Foundry is not ready. Check AI_ENABLED and the three AZURE_AI settings in .env.")
    raise SystemExit(2)
request = AnalysisRequest(scenario="tactics", at=18, player_id=1, language="en",
                          query="Which switches did Theo Wolf play?")
result = asyncio.run(explain(matches["tactics"], request, engines["tactics"]))
print(json.dumps(result, ensure_ascii=False, indent=2))
if (result["source"] != "foundry" or result["agent"]["status"] != "completed"
        or not result.get("claims") or any(s["at"] > 18 for s in result["scenes"])):
    print("Live check failed: the verified Foundry path did not complete.")
    raise SystemExit(1)
print("Verified Foundry tool roundtrip succeeded.")
