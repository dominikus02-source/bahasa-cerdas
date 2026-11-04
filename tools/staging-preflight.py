#!/usr/bin/env python3
"""Read-only deployment access and container metadata audit; never dump Env."""
import hashlib
import json
import os
from pathlib import Path
import pwd
import socket
import subprocess
from urllib.parse import urlsplit

def cmd(args):
    r = subprocess.run(args, capture_output=True, text=True, timeout=30)
    if r.returncode:
        raise RuntimeError("Read-only command failed: " + args[0] + " " + args[1])
    return r.stdout

host = socket.gethostname()
account = pwd.getpwuid(os.geteuid()).pw_name
print(json.dumps({"host": host, "account": account}))
if host != "bc-prod-01" or account != "bcadmin":
    raise SystemExit("Unexpected deploy host/account; stopping before inspection")
if cmd(["docker", "info", "--format", "{{.Name}}"]).strip() != host:
    raise SystemExit("Docker daemon host does not match SSH host")

projects = json.loads(cmd(["docker", "compose", "ls", "--all", "--format", "json"]))
print(json.dumps({"compose_projects": projects}))
ids = cmd(["docker", "ps", "-aq"]).split()
containers = json.loads(cmd(["docker", "inspect", *ids])) if ids else []
identity_keys = ["DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL",
                 "SUPABASE_URL", "REDIS_URL", "LIVEKIT_URL", "LIVEKIT_HOST",
                 "NEXT_PUBLIC_LIVEKIT_URL", "NEXT_PUBLIC_LIVEKIT_WS_URL", "GOTRUE_DB_DATABASE_URL", "GOTRUE_SITE_URL", "API_EXTERNAL_URL", "PGRST_DB_URI", "GLOBAL_S3_BUCKET", "STORAGE_PUBLIC_URL", "STORAGE_BUCKET", "STORAGE_PREFIX"]
for c in containers:
    labels = c["Config"].get("Labels") or {}
    env = dict(v.split("=", 1) for v in c["Config"].get("Env", []) if "=" in v)
    identities = {}
    for key in identity_keys:
        value = env.get(key)
        if not value:
            continue
        p = urlsplit(value)
        # Compare resource identity without username, password or query.
        identity = (p.scheme + "://" + (p.hostname or "") + ":" + str(p.port or "") + p.path) if p.scheme else value
        identities[key] = hashlib.sha256(identity.encode()).hexdigest()
    meta = {
        "container": c["Name"].lstrip("/"), "id": c["Id"][:12],
        "image": c["Config"]["Image"], "image_id": c["Image"],
        "state": c["State"]["Status"],
        "health": c["State"].get("Health", {}).get("Status"),
        "compose_project": labels.get("com.docker.compose.project"),
        "compose_service": labels.get("com.docker.compose.service"),
        "config_files": labels.get("com.docker.compose.project.config_files"),
        "working_dir": labels.get("com.docker.compose.project.working_dir"),
        "revision": labels.get("org.opencontainers.image.revision"),
        "env_revision": env.get("VERCEL_GIT_COMMIT_SHA") if len(env.get("VERCEL_GIT_COMMIT_SHA", "")) == 40 else None,
        "app_env": {k: env[k] for k in ["APP_ENV", "BC_BUILD_ENV", "VERCEL_ENV"] if env.get(k) in ["staging", "production", "preview", "ci", "test"]},
        "networks": list(c["NetworkSettings"].get("Networks", {})),
        "ports": c["NetworkSettings"].get("Ports", {}),
        "mounts": [{k: m.get(k) for k in ["Type", "Name", "Source", "Destination", "RW"]} for m in c.get("Mounts", [])],
        "resource_identity_sha256": identities,
        "environment_keys": sorted(env)
    }
    print(json.dumps(meta))
for name in ["/opt/bahasacerdas/staging", "/opt/bahasacerdas/staging/auth",
             "/opt/bahasacerdas/staging/jumpa", "/opt/bc-book-studio"]:
    p = Path(name)
    print(json.dumps({"path": name, "exists": p.exists(), "readable": os.access(p, os.R_OK), "searchable": os.access(p, os.X_OK)}))

# Read live Caddy configuration via its local admin GET endpoint; never reload it.
def routes(obj, hosts=None):
    hosts = hosts or []
    if isinstance(obj, dict):
        own = [h for m in obj.get("match", []) if isinstance(m, dict) for h in m.get("host", [])]
        inherited = own or hosts
        if obj.get("handler") == "reverse_proxy":
            print(json.dumps({"ingress_hosts": inherited, "upstreams": [u.get("dial") for u in obj.get("upstreams", [])]}))
        for v in obj.values():
            if isinstance(v, (dict, list)):
                routes(v, inherited)
    elif isinstance(obj, list):
        for v in obj:
            routes(v, hosts)
for name in ["bahasacerdas-prod-caddy-1", "jumpa-ingress-staging"]:
    raw = subprocess.run(["docker", "exec", name, "wget", "-qO-", "http://127.0.0.1:2019/config/"], capture_output=True, text=True, timeout=20)
    print(json.dumps({"ingress_container": name, "config_readable": raw.returncode == 0}))
    if raw.returncode == 0:
        routes(json.loads(raw.stdout))

# Identify phase-one verifier code and static asset availability, without secrets.
verifier_probe = """import json,re
from pathlib import Path
from urllib.parse import urlsplit
root=Path('/app')
print(json.dumps({'verifier_app_files':[str(p.relative_to(root)) for p in root.glob('*')]}))
for p in root.glob('*.py'):
 text=p.read_text()
 endpoints=[]
 for value in re.findall(r'https?://[^\\s\\x22\\x27<>]+',text):
  try:
   u=urlsplit(value)
   if u.hostname: endpoints.append(u.scheme+'://'+u.hostname+(':'+str(u.port) if u.port else '')+u.path)
  except ValueError: pass
 print(json.dumps({'source_file':p.name,'endpoint_origins':sorted(set(endpoints)),'mentions_proxy':'proxy' in text.lower(),'mentions_static':'static' in text.lower(),'mentions_books_api':'/api/books' in text}))
"""
probe = subprocess.run(["docker", "exec", "bc-book-studio-staging-verifier-1", "python3", "-c", verifier_probe], capture_output=True, text=True, timeout=20)
print(json.dumps({"verifier_probe_status": probe.returncode}))
if probe.returncode == 0:
    print(probe.stdout)
print("Read-only preflight complete; no deploy, migration, volume or service mutation.")

