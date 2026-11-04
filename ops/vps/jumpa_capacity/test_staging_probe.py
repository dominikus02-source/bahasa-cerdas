"""Staging-host sampler unit tests; use fake psutil and fake cgroup only."""
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from ops.vps.jumpa_capacity.staging_probe import HostSampler

class FakePsutil:
    def __init__(self):
        self.counter=1000000
    def cpu_percent(self,interval=None):
        return 45.
    def net_io_counters(self,pernic=False):
        self.counter+=100000
        return {"ens5":SimpleNamespace(bytes_sent=self.counter)}
    def virtual_memory(self):
        return SimpleNamespace(available=8192*1024*1024)

class StagingHostTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.root=Path(self.tmp.name)
        (self.root/"memory.current").write_text(str(2*1024**3))
        (self.root/"memory.max").write_text(str(4*1024**3))
        (self.root/"memory.events").write_text("oom 0\noom_kill 0\n")
        (self.root/"qa_crashes.counter").write_text("0\n")
        self.psutil=FakePsutil()
    def tearDown(self):
        self.tmp.cleanup()
    def test_real_host_sampling_fixture(self):
        sampler=HostSampler(self.psutil,"ens5",1000,self.root)
        data=sampler.snapshot(now=sampler.prev[0]+2)
        self.assertEqual(data["cpu_percent"],45)
        self.assertEqual(data["container_ram_pct"],50)
        self.assertEqual(data["mem_available_mib"],8192)
        self.assertEqual(data["nic_tx_mbps"],.4)
        self.assertEqual(data["crashes"],0)
    def test_reject_unbounded_cgroup(self):
        (self.root/"memory.max").write_text("max")
        sampler=HostSampler(self.psutil,"ens5",1000,self.root)
        with self.assertRaises(RuntimeError):sampler.snapshot(now=sampler.prev[0]+2)
    def test_reject_missing_crash_counter(self):
        (self.root/"qa_crashes.counter").unlink()
        sampler=HostSampler(self.psutil,"ens5",1000,self.root)
        with self.assertRaises(RuntimeError):sampler.snapshot(now=sampler.prev[0]+2)
    def test_reject_loopback_nic(self):
        with self.assertRaises(ValueError):HostSampler(self.psutil,"lo",1000,self.root)
    def test_reject_no_nic(self):
        with self.assertRaises(RuntimeError):HostSampler(self.psutil,"ethXYZ",1000,self.root)
if __name__=="__main__":
    unittest.main()
