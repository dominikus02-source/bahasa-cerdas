"""Fail-closed staging target validation. No load connections occur here."""
import ipaddress
import os
import socket
from urllib.parse import urlsplit

def _csv(value):
    return {x.strip().lower() for x in (value or "").split(",") if x.strip()}

def validate_target(url, allowed_hosts=None, production_ips=None, resolver=None):
    """Reject unknown, production, loopback, and unresolvable targets."""
    hosts = _csv(allowed_hosts if allowed_hosts is not None else os.getenv("STAGING_ALLOWED_HOSTS"))
    denied = _csv(production_ips if production_ips is not None else os.getenv("PRODUCTION_IPS"))
    parsed = urlsplit(url)
    host = (parsed.hostname or "").lower().rstrip(".")
    if not hosts or not denied:
        raise ValueError("Staging allowlist and production IP denylist are mandatory")
    if parsed.scheme not in ("https", "wss") or not host or host not in hosts:
        raise ValueError("Target must be an explicitly allowlisted staging HTTPS/WSS host")
    if parsed.username or parsed.password or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
        raise ValueError("Unexpected target URL fields")
    if host in {"localhost"}:
        raise ValueError("Loopback and port-forward targets forbidden")
    try:
        denied_ips = {ipaddress.ip_address(x) for x in denied}
        resolve = resolver or socket.getaddrinfo
        answers = resolve(host, parsed.port or 443, type=socket.SOCK_STREAM)
        ips = {ipaddress.ip_address(entry[4][0]) for entry in answers}
    except (OSError, ValueError) as exc:
        raise ValueError("Target DNS resolution/production denylist failed") from exc
    if not ips:
        raise ValueError("Target has no resolved addresses")
    for ip in ips:
        if ip in denied_ips or not ip.is_global:
            raise ValueError("Target is production, loopback, or non-global")
    return {"host": host, "ips": sorted(str(ip) for ip in ips)}

if __name__ == "__main__":
    import unittest
    class TargetTests(unittest.TestCase):
        def setUp(self):
            self.resolve = lambda *a, **k: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("203.0.113.9", 443))]
            # Documentation addresses are not is_global on some Python versions; use public example values
            self.resolve = lambda *a, **k: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("8.8.4.4", 443))]
        def test_allowed(self):
            self.assertEqual(validate_target("https://staging.example.org", "staging.example.org", "1.1.1.1", self.resolve)["host"], "staging.example.org")
        def test_empty_allowlist(self):
            with self.assertRaises(ValueError): validate_target("https://staging.example.org", "", "1.1.1.1", self.resolve)
        def test_production_ip(self):
            with self.assertRaises(ValueError): validate_target("https://staging.example.org", "staging.example.org", "8.8.4.4", self.resolve)
        def test_nonallowlisted(self):
            with self.assertRaises(ValueError): validate_target("https://prod.example.org", "staging.example.org", "1.1.1.1", self.resolve)
        def test_local_tunnel(self):
            with self.assertRaises(ValueError): validate_target("https://localhost:7890", "localhost", "1.1.1.1", self.resolve)
    unittest.main()
