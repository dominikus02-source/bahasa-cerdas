"""Offline E2E with a local fake LiveKit Twirp server. NEVER opens real media.

Positive mock numbers are synthetic; they MUST NOT be published as proof of
20/50/100/150 production or staging capacity.
"""
import asyncio
import json
import socket
import tempfile
import threading
import unittest
import urllib.request
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

from ops.vps.jumpa_capacity.target import validate_target
from ops.vps.jumpa_capacity.admin import LiveKitRoomAdmin
from ops.vps.jumpa_capacity.cleanup import qa_room
from ops.vps import run_capacity

ENV={"STAGING_ALLOWED_HOSTS":"stage.example.org","PRODUCTION_IPS":"1.1.1.1",
     "QA_STAGING_DEDICATED":"true","LIVEKIT_API_KEY":"qa_mock","LIVEKIT_API_SECRET":"mock-secret",
     "PRODUCTION_HEALTH_URL":"https://prod.example.org/api/health",
     "PRODUCTION_HEALTH_HOSTS":"prod.example.org",
     "STAGING_METRICS_URL":"https://metrics.stage.example.org/metrics",
     "STAGING_METRICS_BEARER":"x"*40,"STAGING_NIC":"ens5","STAGING_NIC_LINK_MBPS":"1000"}
STATS=[{"type":"inbound-rtp","packets_lost":1,"packets_received":999,"jitter":0.01},
       {"type":"candidate-pair","selected":True,"current_round_trip_time":0.08}]
class MockLiveKitServer:
    def __init__(self):
        self.rooms={}
        outer=self
        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                try:
                    length=int(self.headers.get("Content-Length","0"))
                    data=json.loads(self.rfile.read(length))
                    method=self.path.rsplit("/",1)[-1]
                    room=data.get("room") or data.get("name")
                    if method=="CreateRoom":
                        outer.rooms[room]=[];reply={"name":room}
                    elif method=="Join":
                        outer.rooms[room].append(data["identity"]);reply={}
                    elif method=="ListParticipants":
                        reply={"participants":[{"identity":i} for i in outer.rooms.get(room,[])]}
                    elif method=="RemoveParticipant":
                        outer.rooms[room].remove(data["identity"]);reply={}
                    elif method=="DeleteRoom":
                        outer.rooms.pop(room,None);reply={}
                    elif method=="ListRooms":
                        reply={"rooms":[{"name":room}]} if room in outer.rooms else {"rooms":[]}
                    else:raise ValueError("Unknown mocked API")
                    raw=json.dumps(reply).encode()
                    self.send_response(200);self.send_header("Content-Type","application/json")
                    self.send_header("Content-Length",str(len(raw)));self.end_headers();self.wfile.write(raw)
                except Exception:
                    self.send_error(500)
            def log_message(self,*a): pass
        self.server=ThreadingHTTPServer(("127.0.0.1",0),Handler)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True)
        self.url="http://127.0.0.1:"+str(self.server.server_port)
    def __enter__(self):self.thread.start();return self
    def __exit__(self,*a):self.server.shutdown();self.server.server_close();self.thread.join()
    async def call(self,method,payload):
        def request():
            req=urllib.request.Request(self.url+"/twirp/livekit.RoomService/"+method,
                data=json.dumps(payload).encode(),headers={"Content-Type":"application/json"})
            with urllib.request.urlopen(req,timeout=2) as resp:return json.load(resp)
        return await asyncio.to_thread(request)
class MockBackend:
    def __init__(self,server):self.server=server
    async def create_room(self,name,cap):return await self.server.call("CreateRoom",{"name":name,"max_participants":cap})
    async def join(self,name,identity):return await self.server.call("Join",{"room":name,"identity":identity})
    async def participants(self,name):
        doc=await self.server.call("ListParticipants",{"room":name})
        return [p["identity"] for p in doc["participants"]]
    async def remove(self,name,identity):return await self.server.call("RemoveParticipant",{"room":name,"identity":identity})
    async def delete(self,name):return await self.server.call("DeleteRoom",{"room":name})
    async def room_exists(self,name):
        result=await self.server.call("ListRooms",{"room":name})
        return bool(result["rooms"])
class MockClient:
    backend=None
    def __init__(self,url,key,secret,room,identity,role):
        self.room,self.identity=room,identity
    async def join(self):
        await self.backend.join(self.room,self.identity)
        return self
    async def publish(self): return None
    async def rtc_stats(self):return STATS
    async def reconnect(self):return True
    async def leave(self):return None
class Metrics:
    def reset(self):pass
    def sample(self):return {"cpu_percent":35}
    def summary(self):
        return {"cpu_p95_pct":35,"ram_peak_limit_pct":50,
          "host_available_min_mib":8192,"tx_p95_link_pct":20,
          "crashes":0,"oom":0}
class Clock:
    def __init__(self):self.now=0
    def __call__(self):return self.now
    async def sleep(self,seconds):self.now+=451

class E2E(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.server=MockLiveKitServer().__enter__()
        self.backend=MockBackend(self.server)
        MockClient.backend=self.backend
        self.tmp=tempfile.TemporaryDirectory()
    async def asyncTearDown(self):
        self.server.__exit__(None,None,None)
        self.tmp.cleanup()
    def runner(self,health=lambda:True):
        clock=Clock()
        admin=LiveKitRoomAdmin("https://stage.example.org","qa_mock","mock-secret",self.backend)
        with patch.object(run_capacity,"validate_target",return_value={"host":"stage.example.org","ips":["8.8.4.4"]}):
            r=run_capacity.CapacityRunner("stage.example.org",ENV,
                admin=admin,metrics=Metrics(),client_factory=MockClient,
                health=health,clock=clock,sleep=clock.sleep,
                output=str(Path(self.tmp.name)/"mock-evidence.json"))
        return r
    async def test_mock_stage_success_room_removed(self):
        r=self.runner()
        metrics=await r.one_scenario(20,"passive")
        self.assertGreaterEqual(metrics["steady_seconds"],900)
        self.assertEqual(r.stage_gate.index,0) # only 1/2 scenarios, not a proven stage
        self.assertEqual(self.server.rooms,{})
    async def test_kill_switch_stops_and_cleans(self):
        calls=[0]
        def health():
            calls[0]+=1
            return calls[0]==1
        r=self.runner(health)
        with self.assertRaises(RuntimeError):
            await r.run()
        self.assertEqual(self.server.rooms,{})
        payload=json.loads(Path(r.output).read_text())
        self.assertEqual(payload["capacity_proven"],0)
        self.assertEqual(payload["status"],"STOPPED")
        self.assertEqual(calls[0],2)
    async def test_cleanup_on_midstage_error(self):
        r=self.runner()
        async def fail(*a,**k):raise RuntimeError("injected telemetry fault")
        r.metrics.sample=fail # returns coroutine; unexpected, see explicit injected health below
        r.health=lambda:False
        with self.assertRaises(RuntimeError):await r.one_scenario(20,"passive")
        self.assertEqual(self.server.rooms,{})
    def test_allowlist_production_rejected(self):
        resolve=lambda *a,**k:[(socket.AF_INET,socket.SOCK_STREAM,6,"",("1.1.1.1",443))]
        with self.assertRaises(ValueError):
            validate_target("https://prod.example.org","stage.example.org","1.1.1.1",resolve)
        with self.assertRaises(ValueError):
            validate_target("https://stage.example.org","stage.example.org","1.1.1.1",resolve)
    def test_dry_run_no_network_media(self):
        from unittest.mock import patch
        with patch.object(run_capacity,"validate_target",return_value={"host":"stage.example.org","ips":["8.8.4.4"]}):
            # Dry-run config validates declarations but never calls LiveKit/production HTTP.
            url,_=run_capacity.config_target("stage.example.org",ENV)
            self.assertEqual(url,"https://stage.example.org")
if __name__=="__main__": unittest.main()
