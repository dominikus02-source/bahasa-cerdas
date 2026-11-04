"""Offline positive/negative tests for the capacity dry-run entrypoint."""
import importlib.util
from pathlib import Path
import socket
import unittest
from unittest.mock import patch
from ops.vps.jumpa_capacity.ram import require_ram

script = Path(__file__).resolve().parents[1] / "test-jumpa-capacity.py"
spec = importlib.util.spec_from_file_location("jumpa_capacity_driver",script)
driver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(driver)
def resolved(*args,**kwargs):
    return [(socket.AF_INET,socket.SOCK_STREAM,6,"",("8.8.4.4",443))]
GOOD = {"LIVEKIT_URL":"https://stage.example.org","STAGING_ALLOWED_HOSTS":"stage.example.org",
        "PRODUCTION_IPS":"1.1.1.1","PRODUCTION_HEALTH_URL":"https://prod.example.org/api/health",
        "STAGING_NIC":"eth1","STAGING_NIC_LINK_MBPS":"1000","QA_TOKEN_TTL_SECONDS":"300",
        "LIVEKIT_API_KEY":"qa_testonly","LIVEKIT_API_SECRET":"qa_testonly_secret"}
class DriverTests(unittest.TestCase):
    def test_dry_run_accepts_offline_fixture(self):
        result=driver.dry_run(GOOD,resolved,4096,60,500)
        self.assertEqual((result["status"],result["media_connections"],result["production_probes"]),
                         ("DRY_RUN_VALIDATED_ONLY",0,0))
    def test_dry_run_rejects_wrong_target(self):
        with self.assertRaises(ValueError):
            driver.dry_run({**GOOD,"LIVEKIT_URL":"https://production.example.org"},resolved,4096,60,500)
    def test_dry_run_rejects_low_memory(self):
        with self.assertRaises(RuntimeError):driver.dry_run(GOOD,resolved,4095,60,500)
    def test_dry_run_rejects_high_cpu(self):
        with self.assertRaises(RuntimeError):driver.dry_run(GOOD,resolved,4096,71,500)
    def test_dry_run_rejects_high_tx(self):
        with self.assertRaises(RuntimeError):driver.dry_run(GOOD,resolved,4096,60,601)
    def test_dry_run_rejects_no_qa_key(self):
        with self.assertRaises(RuntimeError):
            driver.dry_run({**GOOD,"LIVEKIT_API_KEY":"prod"},resolved,4096,60,500)
    def test_execution_without_dry_run_is_rejected(self):
        with self.assertRaises(SystemExit) as raised:driver.main([])
        self.assertEqual(raised.exception.code,2)
    def test_sequence_change_rejected(self):
        with self.assertRaises(SystemExit) as raised:driver.main(["--dry-run","--stages","150"])
        self.assertEqual(raised.exception.code,2)
if __name__=="__main__":unittest.main()
