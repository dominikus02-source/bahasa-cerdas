#!/usr/bin/env python3
"""JUMPA 20->50->100->150 staging-only media QA orchestrator.

WARNING: Normal mode performs an actual media load. NEVER execute until the
owner has approved staging and all firewall/monitoring preflight gates.
Only the --dry-run and injected mock tests are authorized during development.
"""
import argparse
import asyncio
import json
import os
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

if __package__ in (None,""):
    sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
from ops.vps.jumpa_capacity.cleanup import qa_room,validate_qa_room
from ops.vps.jumpa_capacity.target import validate_target
from ops.vps.jumpa_capacity.ram import require_ram
from ops.vps.jumpa_capacity.resources import ResourceGuard
from ops.vps.jumpa_capacity.tokens import issue_token, validate_token, MAX_TTL_SECONDS
from ops.vps.jumpa_capacity.gates import STAGES,SCENARIOS,CRITERIA,StageGate
from ops.vps.jumpa_capacity.livekit_adapter import LiveKitParticipant,join_many
from ops.vps.jumpa_capacity.telemetry import StagingMetrics,ClientMetrics
from ops.vps.jumpa_capacity.health_monitor import production_health_once
from ops.vps.jumpa_capacity.admin import LiveKitRoomAdmin,QACleanup

INTERVAL_SECONDS=2
STEADY_SECONDS=900
def time_utc():
    return datetime.now(timezone.utc).isoformat()
def config_target(target, env, resolver=None):
    url=target if "://" in target else "https://"+target
    resolved=validate_target(url,env.get("STAGING_ALLOWED_HOSTS",""),env.get("PRODUCTION_IPS",""),resolver)
    if not env.get("QA_STAGING_DEDICATED")=="true":
        raise RuntimeError("Explicit dedicated staging assertion required")
    for key in ("LIVEKIT_API_KEY","LIVEKIT_API_SECRET","PRODUCTION_HEALTH_URL",
                "PRODUCTION_HEALTH_HOSTS","STAGING_METRICS_URL","STAGING_METRICS_BEARER",
                "STAGING_NIC","STAGING_NIC_LINK_MBPS"):
        if not env.get(key): raise RuntimeError("Missing required QA env: "+key)
    if not env["LIVEKIT_API_KEY"].startswith("qa_"):raise RuntimeError("QA-only API key required")
    if len(env["STAGING_METRICS_BEARER"])<32:raise RuntimeError("Invalid metrics bearer")
    health=urlsplit(env["PRODUCTION_HEALTH_URL"])
    if (health.scheme!="https" or health.path!="/api/health" or health.query or health.fragment
        or health.hostname not in set(env["PRODUCTION_HEALTH_HOSTS"].split(","))):
        raise RuntimeError("Explicit HTTPS production /api/health required")
    metrics_url=urlsplit(env["STAGING_METRICS_URL"])
    if (metrics_url.scheme!="https" or metrics_url.path!="/metrics"
        or metrics_url.hostname not in set(env.get("STAGING_METRICS_ALLOWED_HOSTS","").split(","))
        or metrics_url.query or metrics_url.fragment):
        raise RuntimeError("Explicit allowlisted HTTPS staging metrics endpoint required")
    if health.hostname in set(env["STAGING_ALLOWED_HOSTS"].split(",")):
        raise RuntimeError("Production health endpoint may not be staging")
    if metrics_url.hostname==health.hostname:
        raise RuntimeError("Staging telemetry may not point to production")
    # Prevent a metrics hostname from resolving to a production address too.
    metrics_origin=f"{metrics_url.scheme}://{metrics_url.netloc}"
    validate_target(metrics_origin,env["STAGING_METRICS_ALLOWED_HOSTS"],env["PRODUCTION_IPS"],resolver)
    link=float(env["STAGING_NIC_LINK_MBPS"])
    if link<=0 or env["STAGING_NIC"]=="lo":raise RuntimeError("Dedicated staging NIC capacity missing")
    ttl=int(env.get("QA_TOKEN_TTL_SECONDS","300"))
    if not 1<=ttl<=MAX_TTL_SECONDS:raise RuntimeError("QA token TTL out of range")
    return url,resolved

def offline_guards(env):
    """Validate all static guards with synthetic fixtures. Never open media/production HTTP."""
    ttl=int(env.get("QA_TOKEN_TTL_SECONDS","300"))
    room=qa_room(20)
    token=issue_token(env["LIVEKIT_API_KEY"],env["LIVEKIT_API_SECRET"],room,"qa-dry-run",
                      ttl_seconds=ttl,now=1000,can_publish=False)
    if validate_token(token,env["LIVEKIT_API_SECRET"],room,now=1001)!="qa-dry-run":
        raise RuntimeError("QA token validation failed")
    require_ram(4096)
    link=float(env["STAGING_NIC_LINK_MBPS"])
    ResourceGuard().update(70,link*.60,link)
    if tuple(STAGES)!=(20,50,100,150) or tuple(SCENARIOS)!=("passive","speakers"):
        raise RuntimeError("Stage/scenario contract modified")
    required={"steady_seconds":900,"join_success_pct":99.0,"reconnect_success_pct":99.0,
        "packet_loss_p95_pct":1.0,"jitter_p95_ms":30.0,"rtt_p95_ms":150.0,
        "cpu_p95_pct":70.0,"ram_peak_limit_pct":80.0,
        "host_available_min_mib":4096.0,"tx_p95_link_pct":60.0,
        "crashes":0,"oom":0}
    if CRITERIA!=required:raise RuntimeError("Locked numeric thresholds modified")
    return True

def report_write(path, payload):
    path=Path(path)
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    lines=["# JUMPA capacity — staging evidence", "",
           f"- UTC: {payload['timestamp']}",
           f"- Status: **{payload['status']}**",
           f"- Kapasitas terbukti: **{payload['capacity_proven']} peserta**",
           "- 0 berarti belum ada tahap yang terbukti; bukan penetapan kapasitas produksi.",
           "- Hasil mock/dry-run tidak boleh dihitung sebagai kapasitas terbukti.", "",
           "| Tahap | Skenario | Status | Bukti numerik / temuan |",
           "| --- | --- | --- | --- |"]
    for x in payload["results"]:
        summary=json.dumps(x.get("metrics",{}),sort_keys=True) if x.get("metrics") else x.get("error","missing")
        lines.append(f"| {x['stage']} | {x['scenario']} | {x['status']} | {summary.replace('|','/')} |")
    path.with_suffix(".md").write_text("\n".join(lines)+"\n",encoding="utf-8")

class CapacityRunner:
    def __init__(self,target,env,admin=None,metrics=None,client_factory=None,
                 health=None,clock=None,sleep=None,output=None):
        self.target,self.resolved=config_target(target,env)
        self.env=env
        self.admin=admin or LiveKitRoomAdmin(self.target,env["LIVEKIT_API_KEY"],env["LIVEKIT_API_SECRET"])
        self.metrics=metrics or StagingMetrics(env["STAGING_METRICS_URL"],env["STAGING_METRICS_BEARER"])
        self.client_factory=client_factory or LiveKitParticipant
        self.health=health or (lambda: production_health_once(env["PRODUCTION_HEALTH_URL"],env["PRODUCTION_HEALTH_HOSTS"]))
        self.clock=clock or time.monotonic
        self.sleep=sleep or asyncio.sleep
        self.output=output or "jumpa-capacity-evidence.json"
        self.stop=asyncio.Event()
        self.stage_gate=StageGate()
        self.data={"timestamp":time_utc(),"status":"INCONCLUSIVE","capacity_proven":0,
                   "environment":"dedicated-staging","results":[],"locked_criteria":CRITERIA}
    async def preflight(self):
        # One health GET read-only, no prod user traffic/media.
        if await asyncio.to_thread(self.health) is not True:
            raise RuntimeError("PRODUCTION_KILL_SWITCH: health not OK")
        # Staging host, NEVER the generator's own CPU/RAM.
        await asyncio.to_thread(self.metrics.sample)
    async def one_scenario(self,count,scenario):
        room=qa_room(count)
        cleanup=QACleanup(self.admin);cleanup.own(room)
        people=[]
        client=ClientMetrics()
        started=None
        max_seen=0
        try:
            if hasattr(self.metrics,"reset"): self.metrics.reset()
            await self.preflight()
            await self.admin.create_room(room,count)
            speaker_count=1 if scenario=="passive" else min(count,6)
            for i in range(count):
                role="speaker" if i<speaker_count else "passive"
                people.append(self.client_factory("wss://"+self.resolved["host"],
                    self.env["LIVEKIT_API_KEY"],self.env["LIVEKIT_API_SECRET"],
                    room,f"qa-{i:04d}",role))
            joins=await join_many(people,concurrency=5)
            client.join=[not isinstance(x,BaseException) for x in joins]
            if not all(client.join):raise RuntimeError("One or more participant joins/publishes failed")
            present=await self.admin.participants(room)
            max_seen=len(present)
            if max_seen < count:raise RuntimeError("Peak concurrent below target")
            started=self.clock()
            recon_done=False
            while self.clock()-started < STEADY_SECONDS:
                if self.stop.is_set():raise RuntimeError("Emergency stop requested")
                # Health failure kills before any subsequent telemetry iteration.
                if await asyncio.to_thread(self.health) is not True:
                    raise RuntimeError("PRODUCTION_KILL_SWITCH: health not OK")
                await asyncio.to_thread(self.metrics.sample)
                elapsed=self.clock()-started
                if elapsed >= STEADY_SECONDS/2 and not recon_done:
                    recon_done=True
                    group=people[:max(1,(count+9)//10)]
                    restored=await asyncio.gather(*(p.reconnect() for p in group),return_exceptions=True)
                    client.reconnect=[r is True for r in restored]
                    if not all(client.reconnect):raise RuntimeError("Reconnect failure")
                    present=await self.admin.participants(room)
                    max_seen=max(max_seen,len(present))
                if elapsed >= 10:
                    # All passive receivers sampled, fail-closed when RTT/jitter unavailable.
                    passive=people[speaker_count:]
                    for person in passive:
                        client.observe(await person.rtc_stats())
                await self.sleep(INTERVAL_SECONDS)
            if not recon_done or not client.samples:raise RuntimeError("Reconnect or RTP metrics missing")
            elapsed=self.clock()-started
            metrics={**self.metrics.summary(),**client.report(),
                     "steady_seconds":elapsed,"peak_concurrent":max_seen}
            self.stage_gate.record(count,scenario,metrics)
            return metrics
        finally:
            failures=[]
            for p in people:
                try: await asyncio.wait_for(p.leave(),timeout=10)
                except Exception:failures.append("participant_leave")
            try: await asyncio.shield(cleanup.cleanup())
            except Exception:failures.append("room_cleanup")
            if failures:raise RuntimeError("QA_CLEANUP_FAILED: "+",".join(failures))
    async def run(self):
        loop=asyncio.get_running_loop()
        callbacks=[]
        def stop():self.stop.set()
        for sig in (signal.SIGINT,signal.SIGTERM):
            try:loop.add_signal_handler(sig,stop);callbacks.append(sig)
            except (NotImplementedError,RuntimeError): pass
        try:
            for stage in STAGES:
                for scenario in SCENARIOS:
                    row={"stage":stage,"scenario":scenario,"timestamp":time_utc(),"status":"FAILED"}
                    self.data["results"].append(row)
                    try:
                        row["metrics"]=await self.one_scenario(stage,scenario)
                        row["status"]="PASSED"
                        if self.stage_gate.index and STAGES[self.stage_gate.index-1]==stage:
                            self.data["capacity_proven"]=stage
                    except Exception as exc:
                        row["error"]=type(exc).__name__ # No credentials, tokens, URLs in reports
                        self.data["status"]="STOPPED"
                        report_write(self.output,self.data)
                        raise
                    report_write(self.output,self.data)
            self.data["status"]="COMPLETED"
            report_write(self.output,self.data)
            return self.data
        finally:
            for sig in callbacks:loop.remove_signal_handler(sig)
            report_write(self.output,self.data)

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--target",required=True,help="Dedicated staging host (not production)")
    p.add_argument("--dry-run",action="store_true",help="Validate guards WITHOUT media or production GET")
    p.add_argument("--output",default="jumpa-capacity-evidence.json")
    args=p.parse_args(argv)
    env=dict(os.environ)
    try:
        url,resolved=config_target(args.target,env)
        if args.dry_run:
            # DNS lookup only; NEVER instantiate metrics, admin, or RTC clients.
            offline_guards(env)
            print(json.dumps({"status":"DRY_RUN_ONLY","host":resolved["host"],
                "media_connections":0,"production_get":0,
                "stages":STAGES,"scenarios":SCENARIOS,"criteria":CRITERIA},sort_keys=True))
            return 0
        runner=CapacityRunner(args.target,env,output=args.output)
        asyncio.run(runner.run())
        return 0
    except Exception as exc:
        print("CAPACITY_NOT_CERTIFIED: "+type(exc).__name__,file=sys.stderr)
        return 2
if __name__=="__main__":
    raise SystemExit(main())
