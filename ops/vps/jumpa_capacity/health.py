"""Production health is read-only; first failure aborts. Dry-run never calls it."""
import json
import urllib.request
from urllib.parse import urlsplit
def check_production_health(url, opener=None):
    parsed = urlsplit(url or "")
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise RuntimeError("Production health URL must be HTTPS")
    fetch = opener or urllib.request.urlopen
    try:
        with fetch(urllib.request.Request(url, headers={"Accept": "application/json"}), timeout=3) as response:
            if response.status != 200:
                raise RuntimeError("Production HTTP health failed")
            document = json.load(response)
            if document.get("status") != "ok" or document.get("db") != "up":
                raise RuntimeError("Production app/database unhealthy")
    except Exception as exc:
        raise RuntimeError("Production health failed: stop immediately") from exc
    return True
if __name__ == "__main__":
    import unittest, io
    class Response:
        status = 200
        def __init__(self, doc): self.doc = doc
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def read(self, *a): return json.dumps(self.doc).encode()
    class HealthTests(unittest.TestCase):
        def test_pass(self): self.assertTrue(check_production_health("https://prod.example.org/api/health", lambda *a, **k: Response({"status":"ok","db":"up"})))
        def test_health_failure(self):
            with self.assertRaises(RuntimeError): check_production_health("https://prod.example.org/api/health", lambda *a, **k: Response({"status":"error","db":"up"}))
        def test_bad_url(self):
            with self.assertRaises(RuntimeError): check_production_health("http://localhost:3000/api/health", lambda *a, **k: Response({"status":"ok","db":"up"}))
        def test_unreachable(self):
            with self.assertRaises(RuntimeError): check_production_health("https://prod.example.org/api/health", lambda *a, **k: (_ for _ in ()).throw(TimeoutError()))
    unittest.main()
