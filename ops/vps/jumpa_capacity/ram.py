"""RAM reserve guard, same threshold in preflight and steady state."""
import os
MIN_AVAILABLE_MIB = 4096
def available_mib(meminfo=None):
    text = meminfo if meminfo is not None else open("/proc/meminfo", encoding="utf-8").read()
    for line in text.splitlines():
        if line.startswith("MemAvailable:"):
            return int(line.split()[1]) // 1024
    raise ValueError("MemAvailable missing")
def require_ram(value_mib, minimum=MIN_AVAILABLE_MIB):
    if value_mib < minimum:
        raise RuntimeError("Insufficient RAM available; require >=4096 MiB")
    return True
if __name__ == "__main__":
    import unittest
    class RamTests(unittest.TestCase):
        def test_pass_boundary(self): self.assertTrue(require_ram(4096))
        def test_reject_below(self):
            with self.assertRaises(RuntimeError): require_ram(4095)
        def test_parse(self): self.assertEqual(available_mib("MemAvailable: 4194304 kB\n"), 4096)
        def test_missing(self):
            with self.assertRaises(ValueError): available_mib("MemFree: 20 kB")
    unittest.main()
