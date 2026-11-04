"""Issue and validate narrow QA participant tokens; never print tokens."""
import base64
import hashlib
import hmac
import json
import time
from .cleanup import validate_qa_room

MAX_TTL_SECONDS = 1800

def b64(data):
    return base64.urlsafe_b64encode(data).decode().rstrip("=")
def issue_token(api_key, api_secret, room, identity, ttl_seconds=300, now=None):
    validate_qa_room(room)
    if not api_key or not api_secret or not identity or not 1 <= ttl_seconds <= MAX_TTL_SECONDS:
        raise ValueError("Missing credentials/identity or invalid QA TTL")
    stamp = int(time.time() if now is None else now)
    header = b64(b'{"alg":"HS256","typ":"JWT"}')
    payload = {"iss":api_key,"sub":identity,"iat":stamp,"nbf":stamp,
               "exp":stamp+ttl_seconds,"video":{"roomJoin":True,"room":room,
                  "canPublish":True,"canSubscribe":True,"canPublishData":False,
                  "roomAdmin":False,"roomCreate":False,"roomList":False}}
    unsigned = header + "." + b64(json.dumps(payload,separators=(",",":")).encode())
    digest = hmac.new(api_secret.encode(),unsigned.encode(),hashlib.sha256).digest()
    return unsigned + "." + b64(digest)
def validate_token(token, secret, room, now=None):
    validate_qa_room(room)
    try:
        head, body, sig = token.split(".")
        expected = b64(hmac.new(secret.encode(), f"{head}.{body}".encode(),hashlib.sha256).digest())
        if not hmac.compare_digest(sig,expected): raise ValueError("Invalid signature")
        claims = json.loads(base64.urlsafe_b64decode(body+"="*(-len(body)%4)))
        stamp = int(time.time() if now is None else now)
        grant = claims["video"]
        if not (claims["nbf"] <= stamp < claims["exp"] and 0 < claims["exp"]-claims["iat"] <= MAX_TTL_SECONDS):
            raise ValueError("Expired/oversized TTL")
        if grant.get("room") != room or grant.get("roomJoin") is not True or grant.get("roomAdmin") or grant.get("roomCreate") or grant.get("roomList"):
            raise ValueError("QA grants exceed minimum")
        return claims["sub"]
    except (KeyError,TypeError,ValueError) as exc:
        raise ValueError("Invalid QA token") from exc
if __name__ == "__main__":
    import unittest
    from .cleanup import qa_room
    class TokenTests(unittest.TestCase):
        def test_pass(self):
            room=qa_room(20); tok=issue_token("qa","secret",room,"p1",now=1000)
            self.assertEqual(validate_token(tok,"secret",room,now=1001),"p1")
        def test_expire(self):
            room=qa_room(20); tok=issue_token("qa","secret",room,"p1",now=1000)
            with self.assertRaises(ValueError):validate_token(tok,"secret",room,now=1300)
        def test_ttl(self):
            with self.assertRaises(ValueError): issue_token("qa","secret",qa_room(20),"p1",1801)
        def test_other_room(self):
            with self.assertRaises(ValueError): issue_token("qa","secret","room-production","p1")
        def test_signature(self):
            room=qa_room(20); tok=issue_token("qa","secret",room,"p1",now=1000)
            with self.assertRaises(ValueError): validate_token(tok,"wrong",room,now=1001)
    unittest.main()
