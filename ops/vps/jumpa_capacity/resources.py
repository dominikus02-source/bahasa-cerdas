"""Host CPU/TX rate gates; fail closed on missing measurements."""
from collections import deque
from statistics import quantiles

CPU_P95_LIMIT = 70.0
TX_P95_LIMIT = 60.0

class ResourceGuard:
    def __init__(self, cpu_limit=CPU_P95_LIMIT, tx_limit=TX_P95_LIMIT):
        self.cpu = deque(maxlen=900)
        self.tx = deque(maxlen=900)
        self.cpu_limit = cpu_limit
        self.tx_limit = tx_limit
    def update(self, cpu_percent, tx_mbps, link_mbps):
        if any(x is None for x in (cpu_percent, tx_mbps, link_mbps)):
            raise RuntimeError("CPU/TX metric missing")
        if not 0 <= cpu_percent <= 100 or tx_mbps < 0 or link_mbps <= 0:
            raise RuntimeError("CPU/TX/link metric invalid")
        tx_percent = tx_mbps * 100.0 / link_mbps
        self.cpu.append(float(cpu_percent))
        self.tx.append(tx_percent)
        if self.p95(self.cpu) > self.cpu_limit or self.p95(self.tx) > self.tx_limit:
            raise RuntimeError("CPU p95 or TX p95 exceeded")
        return True
    @staticmethod
    def p95(values):
        ordered = sorted(values)
        return ordered[max(0, (95 * len(ordered) + 99) // 100 - 1)] if ordered else None

def parse_cpu(line):
    parts = line.split()
    if parts[0] != "cpu":
        raise ValueError("Expected /proc/stat total cpu")
    fields = [int(i) for i in parts[1:]]
    return sum(fields), fields[3] + (fields[4] if len(fields) > 4 else 0)
def cpu_between(before, after):
    total = after[0] - before[0]
    idle = after[1] - before[1]
    if total <= 0 or idle < 0: raise ValueError("CPU counters invalid")
    return 100.0 * (total - idle) / total
def tx_bytes(interface, root="/sys/class/net"):
    if not interface or "/" in interface or interface == "lo":
        raise ValueError("Dedicated NIC required")
    with open(f"{root}/{interface}/statistics/tx_bytes", encoding="utf-8") as f:
        return int(f.read().strip())

if __name__ == "__main__":
    import unittest
    class ResourceTests(unittest.TestCase):
        def test_pass(self):
            self.assertTrue(ResourceGuard().update(65, 500, 1000))
        def test_cpu_reject(self):
            with self.assertRaises(RuntimeError): ResourceGuard().update(72, 20, 1000)
        def test_tx_reject(self):
            with self.assertRaises(RuntimeError): ResourceGuard().update(40, 610, 1000)
        def test_unknown_link_reject(self):
            with self.assertRaises(RuntimeError): ResourceGuard().update(40, 10, 0)
        def test_cpu_delta(self):
            self.assertEqual(cpu_between((100, 20), (200, 50)), 70.0)
    unittest.main()
