"""Remote staging-host telemetry and real client WebRTC stats aggregation.

No local /proc data is ever used for staging measurements. All server numbers
come from an authenticated HTTPS staging metrics agent on the SFU host.
"""
import json
import math
import statistics
import time
import urllib.request
from urllib.parse import urlsplit
from .ram import require_ram
from .resources import ResourceGuard

def p95(values):
    if not values: raise ValueError("Missing samples")
    vals = sorted(float(v) for v in values)
    if any(not math.isfinite(v) or v < 0 for v in vals): raise ValueError("Invalid samples")
    return vals[math.ceil(.95*len(vals))-1]

class StagingMetrics:
    def __init__(self, endpoint, auth, open_url=None):
        p = urlsplit(endpoint or "")
        if p.scheme != "https" or not p.hostname or p.username or p.password or p.query or p.fragment:
            raise ValueError("HTTPS staging metrics endpoint required")
        if not auth: raise ValueError("Staging metrics bearer token required")
        self.endpoint, self.auth = endpoint, auth
        self.open_url = open_url or urllib.request.urlopen
        self.samples = []
        self.guard = ResourceGuard()
    def reset(self):
        self.samples.clear()
        self.guard = ResourceGuard()
    def sample(self):
        req=urllib.request.Request(self.endpoint,headers={"Authorization":"Bearer "+self.auth,"Accept":"application/json"})
        with self.open_url(req, timeout=3) as response:
            if response.status != 200: raise RuntimeError("Staging metrics response not 200")
            data=json.load(response)
        # Required fields supplied by staging host agent, NOT the load generator.
        keys=("cpu_percent","mem_available_mib","container_ram_pct","nic_tx_mbps","nic_link_mbps","crashes","oom")
        if any(k not in data or not isinstance(data[k],(int,float)) or not math.isfinite(data[k]) for k in keys):
            raise RuntimeError("Incomplete staging metrics")
        require_ram(data["mem_available_mib"])
        if not 0 <= data["container_ram_pct"] <= 80 or data["crashes"] != 0 or data["oom"] != 0:
            raise RuntimeError("Staging memory/crash threshold breached")
        self.guard.update(data["cpu_percent"],data["nic_tx_mbps"],data["nic_link_mbps"])
        row={k:data[k] for k in keys}
        row["timestamp"]=time.time()
        self.samples.append(row)
        return row
    def summary(self):
        if not self.samples: raise ValueError("No server telemetry")
        return {"cpu_p95_pct":p95([r["cpu_percent"] for r in self.samples]),
                "ram_peak_limit_pct":max(r["container_ram_pct"] for r in self.samples),
                "host_available_min_mib":min(r["mem_available_mib"] for r in self.samples),
                "tx_p95_link_pct":p95([r["nic_tx_mbps"]*100/r["nic_link_mbps"] for r in self.samples]),
                "crashes":sum(r["crashes"] for r in self.samples),
                "oom":sum(r["oom"] for r in self.samples)}

def _entries(stats):
    # LiveKit Python RTC >=1.2 returns RtcStats(publisher_stats,subscriber_stats)
    # containing proto_stats.RtcStats with a oneof named "stats".
    if hasattr(stats,"subscriber_stats"):
        return list(stats.subscriber_stats) + list(getattr(stats,"publisher_stats",[]))
    if hasattr(stats,"stats"): return stats.stats
    if isinstance(stats,(list,tuple)): return stats
    raise ValueError("Unexpected WebRTC SDK stats format")
def _num(item, key):
    if isinstance(item,dict): value=item.get(key)
    else: value=getattr(item,key,None)
    if not isinstance(value,(int,float)) or not math.isfinite(value) or value < 0:
        raise ValueError(f"WebRTC field {key} missing")
    return float(value)

def client_rtc_sample(reports):
    """Inbound RTP loss/jitter + selected-candidate RTT; fail closed if absent.

    Jitter in WebRTC RTCInboundRtpStreamStats is seconds. RTT in
    candidate-pair stats is seconds, both converted to ms.
    """
    inbound=[];pairs=[]
    for stat in _entries(reports):
        if hasattr(stat,"WhichOneof"):
            variant=stat.WhichOneof("stats")
            if variant=="inbound_rtp":
                received=stat.inbound_rtp.received
                lost=_num(received,"packets_lost")
                received_count=_num(received,"packets_received")
                jitter=_num(received,"jitter")
                if lost+received_count>0:
                    inbound.append((100*lost/(lost+received_count),jitter*1000))
            elif variant=="candidate_pair":
                pair=stat.candidate_pair.candidate_pair
                if pair.nominated:
                    pairs.append(_num(pair,"current_round_trip_time")*1000)
            continue
        typ = stat.get("type") if isinstance(stat,dict) else getattr(stat,"type",None)
        typ=str(typ).lower().replace("_","-")
        if "inbound-rtp" in typ or "inboundrtp" in typ:
            lost=_num(stat,"packets_lost")
            received=_num(stat,"packets_received")
            jitter=_num(stat,"jitter")
            if received+lost<=0: continue
            inbound.append((100*lost/(received+lost),jitter*1000))
        if "candidate-pair" in typ or "candidatepair" in typ:
            selected=stat.get("selected",False) if isinstance(stat,dict) else getattr(stat,"selected",False)
            nominated=stat.get("nominated",False) if isinstance(stat,dict) else getattr(stat,"nominated",False)
            if selected or nominated:
                pairs.append(_num(stat,"current_round_trip_time")*1000)
    if not inbound or not pairs: raise ValueError("Missing inbound RTP or nominated ICE candidate RTT")
    return {"loss_pct":max(x[0] for x in inbound),"jitter_ms":max(x[1] for x in inbound),"rtt_ms":max(pairs)}

class ClientMetrics:
    def __init__(self): self.samples=[]; self.join=[]; self.reconnect=[]
    def observe(self,stat): self.samples.append(client_rtc_sample(stat))
    def report(self):
        if not self.samples or not self.join or not self.reconnect:
            raise ValueError("Missing client quality/join/reconnect samples")
        return {"packet_loss_p95_pct":p95([s["loss_pct"] for s in self.samples]),
                "jitter_p95_ms":p95([s["jitter_ms"] for s in self.samples]),
                "rtt_p95_ms":p95([s["rtt_ms"] for s in self.samples]),
                "join_success_pct":100*sum(self.join)/len(self.join),
                "reconnect_success_pct":100*sum(self.reconnect)/len(self.reconnect)}

if __name__=="__main__":
    import unittest,io
    class Response:
        status=200
        def __init__(self,data):self.data=data
        def __enter__(self):return self
        def __exit__(self,*a):return False
        def read(self,*a):return json.dumps(self.data).encode()
    OK={"cpu_percent":50,"mem_available_mib":4096,"container_ram_pct":60,
        "nic_tx_mbps":500,"nic_link_mbps":1000,"crashes":0,"oom":0}
    RTC=[{"type":"inbound-rtp","packets_lost":1,"packets_received":999,"jitter":.01},
         {"type":"candidate-pair","selected":True,"current_round_trip_time":.08}]
    class TelemetryTests(unittest.TestCase):
        def make(self,data):return StagingMetrics("https://metrics.staging.test/metrics","qa-secret",lambda *a,**k:Response(data))
        def test_host_pass(self):
            m=self.make(OK);m.sample()
            self.assertEqual(m.summary()["cpu_p95_pct"],50)
        def test_host_reject_ram(self):
            with self.assertRaises(RuntimeError):self.make({**OK,"mem_available_mib":4095}).sample()
        def test_host_reject_cpu(self):
            with self.assertRaises(RuntimeError):self.make({**OK,"cpu_percent":71}).sample()
        def test_host_reject_tx(self):
            with self.assertRaises(RuntimeError):self.make({**OK,"nic_tx_mbps":601}).sample()
        def test_host_missing(self):
            with self.assertRaises(RuntimeError):self.make({"cpu_percent":50}).sample()
        def test_client_pass(self):
            m=ClientMetrics();m.observe(RTC);m.join=[True];m.reconnect=[True]
            self.assertEqual(m.report()["rtt_p95_ms"],80)
        def test_client_missing(self):
            with self.assertRaises(ValueError):client_rtc_sample([])
        def test_client_reject_missing_reconnect(self):
            m=ClientMetrics();m.observe(RTC);m.join=[True]
            with self.assertRaises(ValueError):m.report()
        def test_protobuf_sdk_shape(self):
            from types import SimpleNamespace as NS
            class Oneof:
                def __init__(self,variant,**fields):self.variant=variant;self.__dict__.update(fields)
                def WhichOneof(self,name):return self.variant
            inbound=Oneof("inbound_rtp",inbound_rtp=NS(received=NS(packets_lost=1,packets_received=999,jitter=.01)))
            candidate=Oneof("candidate_pair",candidate_pair=NS(candidate_pair=NS(nominated=True,current_round_trip_time=.08)))
            values=client_rtc_sample(NS(subscriber_stats=[inbound,candidate]))
            self.assertEqual(values["rtt_ms"],80)
        def test_p95(self):self.assertEqual(p95([1,2,3,4,5]),5)
    unittest.main()
