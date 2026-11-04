"""Serve staging-SFU host metrics over loopback behind a separate TLS reverse proxy.

Run ONLY on a dedicated staging SFU host, never on production. Requires psutil.
The reverse proxy MUST enforce TLS and independent network allowlists.
"""
import json
import os
import pathlib
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from hmac import compare_digest

class HostSampler:
    def __init__(self, psutil_module, nic, link_mbps, cgroup):
        if not nic or nic=="lo" or link_mbps<=0 or not cgroup:
            raise ValueError("Explicit staging NIC, link speed, and SFU cgroup required")
        self.psutil=psutil_module;self.nic=nic;self.link=link_mbps
        self.cgroup=pathlib.Path(cgroup)
        self.prev=None
        self.psutil.cpu_percent(interval=None)
    def _cgroup_ram(self):
        used=int((self.cgroup/"memory.current").read_text().strip())
        maximum=(self.cgroup/"memory.max").read_text().strip()
        if maximum=="max":raise RuntimeError("SFU cgroup requires finite memory limit")
        limit=int(maximum)
        if limit<=0: raise RuntimeError("Invalid memory limit")
        return used*100/limit
    def snapshot(self, now=None):
        now=time.monotonic() if now is None else now
        counters=self.psutil.net_io_counters(pernic=True)
        if self.nic not in counters: raise RuntimeError("Staging NIC not found")
        total=int(counters[self.nic].bytes_sent)
        if self.prev is None:
            self.prev=(now,total)
            raise RuntimeError("Telemetry warmup incomplete")
        dt=now-self.prev[0]
        delta=total-self.prev[1]
        self.prev=(now,total)
        if dt<=0 or delta<0:raise RuntimeError("NIC sample invalid")
        memory=self.psutil.virtual_memory()
        cpu=float(self.psutil.cpu_percent(interval=None))
        # cgroup OOM counters (and restarted containers) must be exposed by ops.
        events={}
        for line in (self.cgroup/"memory.events").read_text().splitlines():
            k,_,v=line.partition(" ")
            events[k]=int(v)
        if not hasattr(self,"baseline_oom"):
            self.baseline_oom=events.get("oom_kill",0)
        crash_counter=self.cgroup/"qa_crashes.counter"
        crashes=int(crash_counter.read_text()) if crash_counter.exists() else None
        if crashes is None:raise RuntimeError("Staging crash counter missing")
        return {"cpu_percent":cpu,
                "mem_available_mib":int(memory.available//(1024*1024)),
                "container_ram_pct":self._cgroup_ram(),
                "nic_tx_mbps":delta*8/dt/1_000_000,
                "nic_link_mbps":self.link,
                "crashes":crashes,
                "oom":events.get("oom_kill",0)-self.baseline_oom}
def make_handler(sampler, token):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            provided=self.headers.get("Authorization","")
            if not compare_digest(provided,"Bearer "+token):
                self.send_error(403);return
            if self.path!="/metrics":
                self.send_error(404);return
            try: data=sampler.snapshot()
            except Exception:
                self.send_error(503,"metrics not ready");return
            payload=json.dumps(data).encode()
            self.send_response(200);self.send_header("Content-Type","application/json")
            self.send_header("Cache-Control","no-store")
            self.send_header("Content-Length",str(len(payload)));self.end_headers()
            self.wfile.write(payload)
        def log_message(self,*args):
            pass # Never log bearer tokens or URLs
    return Handler
def main():
    if os.getenv("QA_STAGING_DEDICATED")!="true":
        raise SystemExit("Dedicated staging assertion missing")
    token=os.environ["STAGING_METRICS_BEARER"]
    if len(token)<32:raise SystemExit("Metrics bearer too short")
    import psutil
    sampler=HostSampler(psutil,os.environ["STAGING_NIC"],
        float(os.environ["STAGING_NIC_LINK_MBPS"]),os.environ["STAGING_SFU_CGROUP"])
    ThreadingHTTPServer(("127.0.0.1",int(os.getenv("STAGING_METRICS_PORT","9817"))),
        make_handler(sampler,token)).serve_forever()
if __name__=="__main__":
    main()
