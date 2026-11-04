"""Offline-testable guard orchestrator for a future staging-only media adapter.

No LiveKit network transport is implemented. Caller must supply every dependency.
"""
import signal
import time
from .cleanup import install_signal_stop
from .gates import StageGate, SCENARIOS, STAGES
from .health import check_production_health
from .ram import require_ram
from .resources import ResourceGuard

class GuardedRuntime:
    def __init__(self, *, health_probe, ram_probe, resource_probe, cleanup, sleep=lambda s:time.sleep(s)):
        self.health_probe=health_probe
        self.ram_probe=ram_probe
        self.resource_probe=resource_probe
        self.cleanup=cleanup
        self.sleep=sleep
        self.stop={"stop":False}
        self.gate=StageGate()
    def watch(self, ticks, period_seconds=2):
        """Fail immediately on first bad sample or signal. Run cleanup in caller finally."""
        resources=ResourceGuard()
        for _ in range(ticks):
            if self.stop["stop"]: raise RuntimeError("QA interrupted")
            if not self.health_probe(): raise RuntimeError("Production health failed; stopping immediately")
            require_ram(self.ram_probe())
            cpu,tx_mbps,link_mbps=self.resource_probe()
            resources.update(cpu,tx_mbps,link_mbps)
            if self.stop["stop"]: raise RuntimeError("QA interrupted")
            self.sleep(period_seconds)
    def run(self, stage_adapter, monitor_ticks=450):
        """Adapter must be a staging-only implementation; this module does not create one."""
        previous=install_signal_stop(self.stop)
        try:
            for stage in STAGES:
                for scenario in SCENARIOS:
                    if self.stop["stop"]: raise RuntimeError("QA interrupted")
                    self.watch(1,period_seconds=0)
                    # The supplied adapter may only target an already-validated isolated staging room.
                    metrics=stage_adapter(stage,scenario,lambda:self.watch(monitor_ticks))
                    self.gate.record(stage,scenario,metrics)
            return True
        finally:
            try:
                self.cleanup.cleanup()
            finally:
                for sig,old in previous.items(): signal.signal(sig,old)

if __name__=="__main__":
    import unittest
    from .cleanup import RoomCleanup,qa_room
    from .gates import CRITERIA
    class RuntimeTests(unittest.TestCase):
        def make(self, health=lambda:True, ram=lambda:4096, resource=lambda:(50,100,1000)):
            room=qa_room(20)
            calls=[]
            cleanup=RoomCleanup(lambda e:None,lambda r,p:None,lambda r:calls.append("deleted"),lambda r:[])
            cleanup.own(room)
            return GuardedRuntime(health_probe=health,ram_probe=ram,resource_probe=resource,cleanup=cleanup,sleep=lambda s:None),calls
        def test_pass_watch(self):
            runner,calls=self.make()
            runner.watch(2)
            self.assertEqual(len(calls),0)
        def test_reject_first_health_failure(self):
            runner,_=self.make(health=lambda:False)
            with self.assertRaisesRegex(RuntimeError,"Production health"):runner.watch(2)
        def test_reject_ram(self):
            runner,_=self.make(ram=lambda:4095)
            with self.assertRaises(RuntimeError):runner.watch(2)
        def test_reject_cpu(self):
            runner,_=self.make(resource=lambda:(71,100,1000))
            with self.assertRaises(RuntimeError):runner.watch(2)
        def test_cleanup_on_failed_stage(self):
            runner,calls=self.make()
            def fail(stage,scenario,watch):
                raise RuntimeError("Injected media failure")
            with self.assertRaisesRegex(RuntimeError,"Injected media"):
                runner.run(fail,monitor_ticks=1)
            self.assertEqual(calls,["deleted"])
        def test_cleanup_on_signal(self):
            runner,calls=self.make()
            runner.stop["stop"]=True
            with self.assertRaises(RuntimeError):runner.run(lambda *args:None,monitor_ticks=1)
            self.assertEqual(calls,["deleted"])
        def test_stage_gate_all_scenarios(self):
            runner,calls=self.make()
            def synthetic(stage,scenario,watch):
                watch()
                return {**CRITERIA,"peak_concurrent":stage}
            self.assertTrue(runner.run(synthetic,monitor_ticks=1))
            self.assertEqual(runner.gate.index,4)
            self.assertEqual(calls,["deleted"])
    unittest.main()
