#!/usr/bin/env python3
"""Read-only deployment access and container metadata audit; never dump Env."""
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
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
        "public_origins": {k: (urlsplit(env[k]).scheme + "://" + (urlsplit(env[k]).hostname or "") + urlsplit(env[k]).path) for k in ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL", "API_EXTERNAL_URL", "GOTRUE_SITE_URL", "APP_URL"] if env.get(k)},
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

for name in ["jumpa-web-staging", "bahasacerdas-kuis-tempur-staging-web"]:
    js = "try { const p=require('/app/package.json'); console.log(JSON.stringify({name:p.name,version:p.version,next:p.dependencies?.next})); } catch { console.log(JSON.stringify({packageReadable:false})); }"
    r = subprocess.run(["docker", "exec", name, "node", "-e", js], capture_output=True, text=True, timeout=20)
    print(json.dumps({"web_package_container": name, "status": r.returncode}))
    if r.returncode == 0:
        print(r.stdout)
web = next(c for c in containers if c["Name"] == "/jumpa-web-staging")
db = next(c for c in containers if c["Name"] == "/jumpa-db-staging")
web_env = dict(v.split("=", 1) for v in web["Config"].get("Env", []) if "=" in v)
db_url = urlsplit(web_env["DATABASE_URL"])
db_names = {"jumpa-db-staging", db["Config"].get("Hostname")}
for net in db["NetworkSettings"].get("Networks", {}).values():
    db_names.update(net.get("Aliases") or [])
    db_names.add(net.get("IPAddress"))
database = db_url.path.lstrip("/")
print(json.dumps({"web_datasource_matches_staging_db": db_url.hostname in db_names, "database_name": database}))
if db_url.hostname in db_names and database:
    query = "BEGIN READ ONLY; SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name; ROLLBACK;"
    r = subprocess.run(["docker", "exec", "jumpa-db-staging", "psql", "-U", "postgres", "-d", database, "-Atc", query], capture_output=True, text=True, timeout=20)
    print(json.dumps({"staging_schema_container": "jumpa-db-staging", "metadata_read_status": r.returncode}))
    if r.returncode == 0:
        tables = [line for line in r.stdout.splitlines() if line not in ["BEGIN", "ROLLBACK"]]
        print(json.dumps({"staging_public_table_count": len(tables), "staging_public_tables": tables}))
r = subprocess.run(["docker", "exec", "jumpa-ingress-staging", "caddy", "adapt", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"], capture_output=True, text=True, timeout=20)
print(json.dumps({"staging_ingress_adapt_read_status": r.returncode}))
if r.returncode == 0:
    routes(json.loads(r.stdout))

by_name = {c["Name"].lstrip("/"): c for c in containers}
def env_named(name):
    return dict(v.split("=", 1) for v in by_name[name]["Config"].get("Env", []) if "=" in v)
stage_auth_env = env_named("jumpa-auth-staging")
prod_auth_env = env_named("supabase-auth")
stage_web_env = env_named("jumpa-web-staging")
prod_web_env = env_named("bahasacerdas-prod-web-1")
def different(a, b):
    return (a != b) if a and b else None
print(json.dumps({"credential_separation": {
    "auth_signing_secret_different": different(stage_auth_env.get("GOTRUE_JWT_SECRET"), prod_auth_env.get("GOTRUE_JWT_SECRET")),
    "service_role_key_different": different(stage_auth_env.get("STAGING_SERVICE_ROLE_KEY"), prod_web_env.get("SUPABASE_SERVICE_ROLE_KEY")),
    "anon_key_different": different(stage_auth_env.get("STAGING_ANON_KEY"), prod_web_env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")),
    "livekit_secret_different": different(stage_web_env.get("LIVEKIT_API_SECRET"), prod_web_env.get("LIVEKIT_API_SECRET"))
}}))

task_root = Path.home() / "bc-staging-activation"
if task_root.exists():
    for task in sorted(task_root.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)[:5]:
        state_file = task / "status.json"
        if state_file.is_file():
            value = json.loads(state_file.read_text())
            print(json.dumps({"staging_task_status": task.name, "summary": value}))
        else:
            log_file = task / "result.log"
            progress = []
            build_progress = {}
            for log in [task / "build-1.log", task / "build-2.log"]:
                if log.is_file():
                    safe_lines = [line for line in log.read_text().splitlines() if re.match(r"^#\\d+ (?:\\[.*\\] RUN|CACHED$|DONE [0-9.]+s$|ERROR:)", line)]
                    build_progress[log.name] = safe_lines[-5:]
            if log_file.is_file():
                for line in log_file.read_text().splitlines():
                    try:
                        value = json.loads(line)
                        if isinstance(value, dict) and any(k in value for k in ["state", "run", "check"]):
                            progress.append(value)
                    except ValueError:
                        pass
            print(json.dumps({"staging_task_pending": task.name, "recent_progress": progress[-3:], "build_progress": build_progress}))
print("Read-only preflight complete; no deploy, migration, volume or service mutation.")



