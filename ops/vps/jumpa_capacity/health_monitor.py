"""One read-only GET per tick against explicit production health endpoint.

No production GET is performed during dry-run, imports or tests.
"""
import json
import urllib.request
from urllib.parse import urlsplit
from .target import _csv

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError("Production health redirects forbidden")

def production_health_once(endpoint, allowed_hosts, opener=None):
    uri=urlsplit(endpoint or "")
    allow=_csv(allowed_hosts)
    if not allow or uri.scheme!="https" or uri.hostname not in allow or uri.path!="/api/health" or uri.query or uri.fragment or uri.username or uri.password:
        raise RuntimeError("Explicit HTTPS production /api/health endpoint required")
    fetch=opener or urllib.request.build_opener(NoRedirect()).open
    # One GET; no retry, no POST and no auth/token.
    req=urllib.request.Request(endpoint,headers={"Accept":"application/json"},method="GET")
    try:
        with fetch(req,timeout=3) as response:
            if response.status!=200:raise RuntimeError("Production health HTTP not 200")
            if hasattr(response,"geturl") and response.geturl()!=endpoint:
                raise RuntimeError("Health endpoint redirected")
            body=json.load(response)
            if body.get("status")!="ok" or body.get("db")!="up":
                raise RuntimeError("Production app/database unhealthy")
    except Exception as exc:
        raise RuntimeError("PRODUCTION_KILL_SWITCH: first health failure") from exc
    return True

if __name__=="__main__":
    import unittest
    class Resp:
        status=200
        def __init__(self,doc,url):self.doc,self.url=doc,url
        def __enter__(self):return self
        def __exit__(self,*a):return False
        def geturl(self):return self.url
        def read(self,*a):return json.dumps(self.doc).encode()
    URL="https://prod.example.org/api/health"
    class HealthMonitorTests(unittest.TestCase):
        def test_one_get(self):
            called=[]
            def fake(req,timeout):
                called.append((req.get_method(),timeout))
                return Resp({"status":"ok","db":"up"},URL)
            self.assertTrue(production_health_once(URL,"prod.example.org",fake))
            self.assertEqual(called,[("GET",3)])
        def test_fail_first(self):
            with self.assertRaisesRegex(RuntimeError,"KILL_SWITCH"):
                production_health_once(URL,"prod.example.org",lambda *a,**k:Resp({"status":"down","db":"up"},URL))
        def test_reject_wrong_host(self):
            with self.assertRaises(RuntimeError):
                production_health_once(URL,"other.example.org",lambda *a,**k:None)
        def test_reject_redirect(self):
            with self.assertRaisesRegex(RuntimeError,"KILL_SWITCH"):
                production_health_once(URL,"prod.example.org",lambda *a,**k:Resp({"status":"ok","db":"up"},"https://other.example.org/"))
    unittest.main()
