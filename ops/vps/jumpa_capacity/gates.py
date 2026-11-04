"""Locked numerical media acceptance and strict stage progression."""
from dataclasses import dataclass
STAGES=(20,50,100,150)
SCENARIOS=("passive","speakers")
CRITERIA={"steady_seconds":900,"join_success_pct":99.0,"reconnect_success_pct":99.0,
    "packet_loss_p95_pct":1.0,"jitter_p95_ms":30.0,"rtt_p95_ms":150.0,
    "cpu_p95_pct":70.0,"ram_peak_limit_pct":80.0,
    "host_available_min_mib":4096.0,"tx_p95_link_pct":60.0,"crashes":0,"oom":0}
def validate_metrics(data, concurrent_target):
    if not isinstance(data,dict): raise ValueError("Metrics missing")
    for key,value in CRITERIA.items():
        if key not in data or not isinstance(data[key],(int,float)) or isinstance(data[key],bool):
            raise ValueError(f"Missing/invalid metric: {key}")
    if "peak_concurrent" not in data or not isinstance(data["peak_concurrent"],int):
        raise ValueError("Peak concurrent missing")
    if data["peak_concurrent"] < concurrent_target:
        raise ValueError("Target peak concurrent not attained")
    for key,minimum in (("steady_seconds",900),("join_success_pct",99),("reconnect_success_pct",99),("host_available_min_mib",4096)):
        if data[key] < minimum: raise ValueError(f"Threshold failed: {key}")
    for key,maximum in CRITERIA.items():
        if key in ("steady_seconds","join_success_pct","reconnect_success_pct","host_available_min_mib"): continue
        if data[key] < 0 or data[key] > maximum: raise ValueError(f"Threshold failed: {key}")
    return True
class StageGate:
    def __init__(self): self.index=0; self.complete=set()
    def record(self,stage,scenario,data):
        if self.index >= len(STAGES) or stage!=STAGES[self.index]:
            raise ValueError("Skipped/unapproved QA stage")
        if scenario not in SCENARIOS or (stage,scenario) in self.complete:
            raise ValueError("Unknown/duplicate scenario")
        validate_metrics(data,stage)
        self.complete.add((stage,scenario))
        if all((stage,s) in self.complete for s in SCENARIOS): self.index+=1
        return self.index
if __name__ == "__main__":
    import unittest
    def good(n):
        return {**CRITERIA,"peak_concurrent":n}
    class GateTests(unittest.TestCase):
        def test_pass_both(self):
            g=StageGate();self.assertEqual(g.record(20,"passive",good(20)),0)
            self.assertEqual(g.record(20,"speakers",good(20)),1)
        def test_skip(self):
            with self.assertRaises(ValueError):StageGate().record(150,"passive",good(150))
        def test_missing(self):
            d=good(20);del d["jitter_p95_ms"]
            with self.assertRaises(ValueError):StageGate().record(20,"passive",d)
        def test_fail(self):
            d=good(20);d["packet_loss_p95_pct"]=1.1
            with self.assertRaises(ValueError):StageGate().record(20,"passive",d)
        def test_missing_peak(self):
            d=good(20);d["peak_concurrent"]=19
            with self.assertRaises(ValueError):StageGate().record(20,"passive",d)
    unittest.main()
