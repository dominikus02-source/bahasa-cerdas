#!/usr/bin/env python3
"""Fail-closed QA capacity runner.

Only --dry-run is enabled until isolated staging + independent telemetry exist.
There is intentionally no command path that launches media load here.
"""
import argparse
import os
import sys
from pathlib import Path
from urllib.parse import urlsplit

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from ops.vps.jumpa_capacity.target import validate_target
from ops.vps.jumpa_capacity.ram import require_ram, available_mib
from ops.vps.jumpa_capacity.resources import ResourceGuard
from ops.vps.jumpa_capacity.gates import CRITERIA, STAGES, SCENARIOS, StageGate
from ops.vps.jumpa_capacity.cleanup import qa_room, validate_qa_room
from ops.vps.jumpa_capacity.tokens import issue_token, validate_token, MAX_TTL_SECONDS

def dry_run(config, resolver, free_mib, cpu_percent, tx_mbps):
    """Validate constraints without reaching media/production endpoints or starting child processes."""
    target = validate_target(config.get("LIVEKIT_URL",""),
        config.get("STAGING_ALLOWED_HOSTS",""),
        config.get("PRODUCTION_IPS",""), resolver)
    health = urlsplit(config.get("PRODUCTION_HEALTH_URL",""))
    if health.scheme != "https" or not health.hostname or health.username or health.password:
        raise RuntimeError("Verified HTTPS production health URL required")
    require_ram(free_mib)
    link = float(config.get("STAGING_NIC_LINK_MBPS","0"))
    ResourceGuard().update(cpu_percent, tx_mbps, link)
    if not config.get("STAGING_NIC") or config["STAGING_NIC"]=="lo":
        raise RuntimeError("Dedicated staging NIC required")
    if int(config.get("QA_TOKEN_TTL_SECONDS","300")) > MAX_TTL_SECONDS:
        raise RuntimeError("Token TTL exceeds 30 minutes")
    room = qa_room(20)
    validate_qa_room(room)
    if not config.get("LIVEKIT_API_KEY","").startswith("qa_") or not config.get("LIVEKIT_API_SECRET"):
        raise RuntimeError("Dedicated QA-only credentials required")
    token = issue_token(config["LIVEKIT_API_KEY"],config["LIVEKIT_API_SECRET"],room,"dry-run",
                        int(config.get("QA_TOKEN_TTL_SECONDS","300")),now=1000)
    validate_token(token,config["LIVEKIT_API_SECRET"],room,now=1001)
    if STAGES != (20,50,100,150) or SCENARIOS != ("passive","speakers"):
        raise RuntimeError("Locked stages/scenarios modified")
    if not isinstance(CRITERIA, dict) or len(CRITERIA)<10:
        raise RuntimeError("Numeric QA criteria missing")
    return {"status":"DRY_RUN_VALIDATED_ONLY","host":target["host"],"stages":list(STAGES),
            "scenarios":list(SCENARIOS),"media_connections":0,"production_probes":0}

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true", required=True)
    p.add_argument("--stages", default="20,50,100,150")
    args=p.parse_args(argv)
    if args.stages != "20,50,100,150":
        p.error("All four stages must remain in order")
    # Host DNS only, never connects to media or production. No secrets in output.
    config=dict(os.environ)
    try:
        import json
        result=dry_run(config,None,available_mib(),float(config.get("DRY_RUN_CPU_PCT","0")),float(config.get("DRY_RUN_TX_MBPS","0")))
        print(json.dumps(result,sort_keys=True))
        return 0
    except Exception as exc:
        print("DRY_RUN_REJECTED: "+str(exc),file=sys.stderr)
        return 2

if __name__=="__main__":
    raise SystemExit(main())
