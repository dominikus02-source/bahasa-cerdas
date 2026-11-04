#!/usr/bin/env python3
"""Deploy only the already mapped, unmanaged JUMPA staging web container."""
import base64
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import time
from urllib.parse import urlsplit

TARGET = "jumpa-web-staging"
NETWORK = "jumpa-staging-net"
DOMAIN = "https://staging.bahasacerdas.com"
BASE_IMAGE = "sha256:8b9e333de5483684e2857815484f420a92c1d258e2e3ee433042d21539e09ba2"
BUILDER = "bc-bahasacerdas-staging-cache"
sha, run_tag = sys.argv[1:3]
assert re.fullmatch(r"[0-9a-f]{40}", sha)
assert re.fullmatch(r"[0-9-]+", run_tag)
assert socket.gethostname() == "bc-prod-01"
assert os.getuid() != 0, "Use the existing bcadmin deploy account"
os.umask(0o077)
root = Path.home() / "bc-staging-activation" / (sha + "-" + run_tag)
root.mkdir(parents=True, exist_ok=True)
status_file = root / "status.json"
lock = open(Path.home() / ".bc-staging-activation.lock", "a")
started = time.monotonic()
swapped = False
old_name = TARGET + "-rollback-" + run_tag
candidate = TARGET + "-candidate-" + run_tag
summary = {"commit": sha, "environment": "staging", "url": DOMAIN, "state": "running"}

def emit(data):
    print(json.dumps(data), flush=True)

def run(args, *, cwd=None, log=None):
    if log:
        with open(log, "w") as f:
            r = subprocess.run(args, cwd=cwd, stdout=f, stderr=subprocess.STDOUT, text=True)
        output = ""
    else:
        r = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
        output = r.stdout
    if r.returncode:
        raise RuntimeError("Command failed: " + args[0] + " " + args[1])
    return output

def inspect(name):
    return json.loads(run(["docker", "inspect", name]))[0]

def env_of(c):
    return dict(v.split("=", 1) for v in c["Config"].get("Env", []) if "=" in v)

def json_file(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")
    path.chmod(0o600)

def env_file(path, values):
    for k, v in values.items():
        assert re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", k)
        assert "\n" not in v and "\r" not in v, "Multiline environment value is unsupported"
    path.write_text("".join(k + "=" + v + "\n" for k, v in sorted(values.items())))
    path.chmod(0o600)

def health(name):
    js = "fetch('http://127.0.0.1:3000/api/health').then(r=>r.json()).then(d=>process.exit(d.status==='ok'&&d.db==='up'?0:1)).catch(()=>process.exit(1))"
    for _ in range(60):
        r = subprocess.run(["docker", "exec", name, "node", "-e", js], capture_output=True, text=True)
        if r.returncode == 0:
            return
        time.sleep(2)
    raise RuntimeError("Staging container did not become healthy")

def public_health(url):
    d = json.loads(run(["curl", "--fail", "--silent", "--show-error", "--max-time", "20", url + "/api/health"]))
    assert d.get("status") == "ok" and d.get("db") == "up", "Public health failed"

def build_metrics(log):
    text = log.read_text()
    ids = {}
    for line in text.splitlines():
        m = re.match(r"#(\d+) \[([^]]+)\] RUN (.*)", line)
        if m and "npm ci" in m[3]:
            ids["install"] = m[1]
        if m and "npm run build" in m[3]:
            ids["application_build"] = m[1]
    result = {"cached_step_count": len(re.findall(r"^#\d+ CACHED$", text, re.M))}
    for name, number in ids.items():
        cached = re.search(r"^#" + number + r" CACHED$", text, re.M)
        done = re.search(r"^#" + number + r" DONE ([0-9.]+)s$", text, re.M)
        result[name + "_seconds"] = 0.0 if cached else (float(done[1]) if done else None)
        result[name + "_cache_hit"] = bool(cached)
    return result

try:
    lock_started = time.monotonic()
    emitted_wait = False
    while True:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            break
        except BlockingIOError:
            if not emitted_wait:
                emit({"state": "waiting-for-existing-staging-task"})
                emitted_wait = True
            if time.monotonic() - lock_started > 1200:
                raise RuntimeError("Another authorized staging task still owns the lock; it was not stopped")
            time.sleep(10)
    summary["lock_wait_seconds"] = round(time.monotonic() - lock_started, 3)
    execution_started = time.monotonic()
    assert os.environ.get("USER", "bcadmin") == "bcadmin", "Unexpected account"
    old = inspect(TARGET)
    old_image_metadata = json.loads(run(["docker", "image", "inspect", old["Image"]]))[0]
    old_labels = old_image_metadata["Config"].get("Labels") or {}
    previous_revision = old_labels.get("org.opencontainers.image.revision", "")
    owned_revision = old_labels.get("com.bahasacerdas.environment") == "staging" and re.fullmatch(r"[0-9a-f]{40}", previous_revision)
    assert old["Image"] == BASE_IMAGE or owned_revision, "Staging moved to an unrecognized image; review before deploying"
    summary["previous_revision"] = previous_revision if owned_revision else None
    assert set(old["NetworkSettings"]["Networks"]) == {NETWORK}
    assert not old.get("Mounts"), "Unexpected app mounts; do not recreate automatically"
    assert old["HostConfig"]["PortBindings"] == {"3000/tcp": [{"HostIp": "127.0.0.1", "HostPort": "13000"}]}
    policy = old["HostConfig"]["RestartPolicy"]["Name"] or "no"
    assert policy in ["no", "always", "unless-stopped"], "Unsupported restart policy"
    prod_names = ["bahasacerdas-prod-web-1", "bahasacerdas-prod-caddy-1", "bahasacerdas-prod-livekit-1"]
    prod_ids = {n: (inspect(n)["Id"], inspect(n)["Image"]) for n in prod_names}
    public_health("https://www.bahasacerdas.com")
    public_health(DOMAIN)
    json_file(root / "rollback-private.json", old)
    summary["previous_image_id"] = old["Image"]
    summary["previous_container_id"] = old["Id"]
    summary["rollback_config_sha256"] = hashlib.sha256(json.dumps(old["Config"], sort_keys=True).encode()).hexdigest()

    runtime = env_of(old)
    db = inspect("jumpa-db-staging")
    db_url = urlsplit(runtime["DATABASE_URL"])
    allowed = {"jumpa-db-staging", db["Config"].get("Hostname")}
    for net in db["NetworkSettings"]["Networks"].values():
        allowed.update(net.get("Aliases") or [])
        allowed.add(net.get("IPAddress"))
    assert db_url.hostname in allowed and db_url.path == "/jumpa_staging"
    prod_env = env_of(inspect("bahasacerdas-prod-web-1"))
    assert runtime["DATABASE_URL"] != prod_env["DATABASE_URL"]
    assert runtime["LIVEKIT_URL"] != prod_env.get("LIVEKIT_URL")
    auth = env_of(inspect("jumpa-auth-staging"))
    assert auth["GOTRUE_SITE_URL"] == DOMAIN
    auth_url = auth["API_EXTERNAL_URL"].removesuffix("/auth/v1")
    assert auth_url == "https://auth-staging.bahasacerdas.com"
    assert auth_url != prod_env["NEXT_PUBLIC_SUPABASE_URL"]
    for key, role in [("STAGING_ANON_KEY", "anon"), ("STAGING_SERVICE_ROLE_KEY", "service_role")]:
        part = auth[key].split(".")[1]
        assert json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4))).get("role") == role
    run(["curl", "--fail", "--silent", "--show-error", "--max-time", "20", auth_url + "/auth/v1/health"])

    assert shutil.disk_usage("/").free >= 12 * 1024**3, "Insufficient free disk"
    mem = dict(line.split(":", 1) for line in Path("/proc/meminfo").read_text().splitlines())
    assert int(mem["MemAvailable"].strip().split()[0]) >= 7 * 1024**2, "Insufficient available RAM"
    repo = root / "source"
    run(["git", "clone", "--quiet", "--single-branch", "--branch", "chore/staging-acceleration-20261104",
         "https://github.com/dominikus02-source/bahasa-cerdas.git", str(repo)])
    assert run(["git", "rev-parse", "HEAD"], cwd=repo).strip() == sha, "PR branch moved"
    if owned_revision:
        run(["git", "merge-base", "--is-ancestor", previous_revision, sha], cwd=repo)
    query = "BEGIN READ ONLY; SELECT table_name FROM information_schema.tables WHERE table_schema='public'; ROLLBACK;"
    tables = set(run(["docker", "exec", "jumpa-db-staging", "psql", "-U", "postgres", "-d", "jumpa_staging", "-Atc", query]).splitlines())
    models = set(re.findall(r"^model\s+(\w+)\s*\{", (repo / "prisma/schema.prisma").read_text(), re.M))
    missing_models = models - tables
    # These three unrelated writing/curriculum tables are already absent in
    # the inspected staging baseline. Do not migrate them for a cache task.
    known_untested_modules = {"WritingProject", "WritingChapter", "CurriculumProgress"}
    assert missing_models <= known_untested_modules, "Required staging tables are missing; migrations are forbidden"
    assert {"User", "Profile", "JumpaRoom", "JumpaParticipant", "JumpaChatMessage", "JumpaEvent"} <= tables
    summary["preexisting_untested_schema_modules"] = sorted(missing_models)

    runtime.update({
        "APP_ENV": "staging", "BC_BUILD_ENV": "staging", "APP_URL": DOMAIN,
        "NEXT_PUBLIC_SITE_URL": DOMAIN, "NEXT_PUBLIC_SUPABASE_URL": auth_url,
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": auth["STAGING_ANON_KEY"],
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": auth["STAGING_ANON_KEY"],
        "SUPABASE_SERVICE_ROLE_KEY": auth["STAGING_SERVICE_ROLE_KEY"],
        "HOSTNAME": "0.0.0.0", "PORT": "3000", "NODE_ENV": "production",
        "MIDTRANS_IS_PRODUCTION": "false", "NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION": "false",
        "PAYOUT_REAL_MONEY_ENABLED": "false", "PAYOUT_PROVIDER_ENABLED": "false",
        "PAYOUT_KILL_SWITCH": "true", "CRON_ENABLED": "false"
    })
    private_env = root / "runtime.env"
    env_file(private_env, runtime)
    # Only public client configuration and fake database URLs enter the build.
    build_env = {k: v for k, v in runtime.items() if k.startswith("NEXT_PUBLIC_")}
    build_env.update({"DATABASE_URL": "postgresql://build:placeholder@127.0.0.1:5432/build",
                      "DIRECT_URL": "postgresql://build:placeholder@127.0.0.1:5432/build"})
    build_file = root / "build-public.env"
    env_file(build_file, build_env)
    fingerprint = hashlib.sha256(json.dumps(build_env, sort_keys=True).encode()).hexdigest()
    marker = Path.home() / ".bc-staging-buildkit-owner"
    probe = subprocess.run(["docker", "buildx", "inspect", BUILDER], capture_output=True, text=True)
    if probe.returncode == 0:
        assert marker.exists(), "Existing builder is not owned by this staging mechanism"
        summary["first_build_cache_state"] = "existing dedicated staging cache"
    else:
        config = root / "buildkitd.toml"
        config.write_text('[worker.oci]\n  max-parallelism = 1\n')
        run(["docker", "buildx", "create", "--name", BUILDER, "--driver", "docker-container",
             "--driver-opt", "memory=6g", "--driver-opt", "cpu-quota=200000",
             "--driver-opt", "cpu-period=100000", "--buildkitd-config", str(config)])
        marker.write_text("bahasacerdas/staging\n")
        summary["first_build_cache_state"] = "new dedicated staging builder; no shared cache cleared"
    image = "bahasacerdas/web:staging-cache-" + sha
    args = ["docker", "buildx", "build", "--builder", BUILDER, "--load", "--progress", "plain",
            "--build-arg", "BC_BUILD_ENV=staging", "--build-arg", "BUILD_CACHE_SCOPE=bahasacerdas-staging",
            "--build-arg", "WEB_BUILD_FINGERPRINT=" + fingerprint,
            "--secret", "id=web_env,src=" + str(build_file),
            "--label", "org.opencontainers.image.revision=" + sha,
            "--label", "com.bahasacerdas.environment=staging", "-f", "Dockerfile.web", "-t", image, "."]
    summary["builds"] = []
    image_ids = []
    log = root / "build-1.log"
    at = time.monotonic()
    run(args, cwd=repo, log=log)
    metrics = build_metrics(log)
    metrics.update({"run": 1, "image_build_seconds": round(time.monotonic() - at, 3)})
    summary["builds"].append(metrics)
    image_ids.append(json.loads(run(["docker", "image", "inspect", image]))[0]["Id"])
    emit(metrics)

    rollback_tag = "bahasacerdas/web:staging-rollback-" + run_tag
    run(["docker", "tag", old["Image"], rollback_tag])
    summary["rollback_image"] = rollback_tag
    run(["docker", "run", "-d", "--name", candidate, "--network", NETWORK,
         "--env-file", str(private_env), "--label", "com.bahasacerdas.environment=staging", image])
    health(candidate)
    assert inspect(TARGET)["Id"] == old["Id"], "Staging changed during build; refusing replacement"
    deploy_at = time.monotonic()
    swapped = True
    run(["docker", "stop", "--time", "30", TARGET])
    run(["docker", "rename", TARGET, old_name])
    run(["docker", "run", "-d", "--name", TARGET, "--network", NETWORK,
         "--env-file", str(private_env), "--publish", "127.0.0.1:13000:3000", "--restart", policy, image])
    health(TARGET)
    public_health(DOMAIN)
    assert inspect(TARGET)["Image"] == image_ids[0]
    cold_healthy_seconds = round(time.monotonic() - deploy_at, 3)
    # Standalone Next images need not retain bundled SDK package directories.
    # Use the already-cached Node-22 deps target as a disposable QA image.
    qa_image = "bahasacerdas/staging-qa:" + sha
    run(["docker", "buildx", "build", "--builder", BUILDER, "--load", "--target", "deps",
         "--build-arg", "BUILD_CACHE_SCOPE=bahasacerdas-staging",
         "-f", "Dockerfile.web", "-t", qa_image, "."],
        cwd=repo, log=root / "qa-deps-build.log")
    auth_check = subprocess.run([
        "docker", "run", "--rm", "--network", NETWORK,
        "--env-file", str(private_env),
        "--mount", "type=bind,src=" + str(repo / "prisma") + ",dst=/app/prisma,readonly",
        "--mount", "type=bind,src=" + str(repo / "tools/staging-auth-check.cjs") + ",dst=/app/staging-auth-check.cjs,readonly",
        qa_image, "sh", "-c", "npx prisma generate >/dev/null && node /app/staging-auth-check.cjs"
    ], capture_output=True, text=True, timeout=240)
    for line in auth_check.stdout.splitlines():
        try:
            record = json.loads(line)
            if "check" in record and isinstance(record.get("passed"), bool):
                emit(record)
        except ValueError:
            pass
    assert auth_check.returncode == 0, "Staging authenticated HTTP checks failed"
    summary["http_auth_integration_passed"] = True
    summary["browser_authenticated_tested"] = False
    summary["actual_media_tested"] = False
    final_image = json.loads(run(["docker", "image", "inspect", image]))[0]
    assert final_image["Config"]["Labels"]["org.opencontainers.image.revision"] == sha
    assert {n: (inspect(n)["Id"], inspect(n)["Image"]) for n in prod_names} == prod_ids
    public_health("https://www.bahasacerdas.com")
    summary["deployments"] = [{"run": 1, "until_healthy_seconds": cold_healthy_seconds,
                                "pipeline_total_seconds": round(time.monotonic() - started, 3),
                                "pipeline_execution_seconds": round(time.monotonic() - execution_started, 3),
                                "container_replaced": True}]
    # Repeat the identical build and environment. An unchanged image requires
    # health verification, not another unnecessary container restart.
    warm_at = time.monotonic()
    log = root / "build-2.log"
    at = time.monotonic()
    run(args, cwd=repo, log=log)
    metrics = build_metrics(log)
    metrics.update({"run": 2, "image_build_seconds": round(time.monotonic() - at, 3)})
    summary["builds"].append(metrics)
    image_ids.append(json.loads(run(["docker", "image", "inspect", image]))[0]["Id"])
    assert image_ids[0] == image_ids[1], "Same-input rebuild produced a different image"
    assert metrics.get("install_cache_hit") and metrics.get("application_build_cache_hit"), "Warm build did not reuse install/build layers"
    deploy_at = time.monotonic()
    health(TARGET)
    public_health(DOMAIN)
    assert inspect(TARGET)["Image"] == image_ids[1]
    summary["deployments"].append({"run": 2, "until_healthy_seconds": round(time.monotonic() - deploy_at, 3),
                                   "pipeline_total_seconds": round(time.monotonic() - warm_at, 3),
                                   "container_replaced": False, "reason": "image unchanged; healthy no-op"})
    summary.update({"state": "passed", "image": image, "image_id": image_ids[1],
                    "total_seconds": round(time.monotonic() - started, 3),
                    "rollback_container": old_name, "production_unchanged": True})
    emit(summary)
except Exception as error:
    summary.update({"state": "failed", "error": str(error)})
    if swapped:
        try:
            current = subprocess.run(["docker", "inspect", TARGET], capture_output=True, text=True)
            if current.returncode == 0:
                present = json.loads(current.stdout)[0]
                if present["Id"] != old["Id"]:
                    assert present["Image"] == image_ids[0], "Another actor changed staging; do not overwrite it"
                    run(["docker", "stop", "--time", "30", TARGET])
                    run(["docker", "rename", TARGET, TARGET + "-failed-" + run_tag])
            baseline = inspect(old["Id"])
            if baseline["Name"] != "/" + TARGET:
                run(["docker", "rename", old["Id"], TARGET])
            run(["docker", "start", old["Id"]])
            health(TARGET)
            public_health(DOMAIN)
            summary["rollback_recovered"] = True
        except Exception:
            summary["rollback_recovered"] = False
    else:
        summary["running_staging_was_replaced"] = False
    emit(summary)
finally:
    candidate_probe = subprocess.run(["docker", "inspect", candidate], capture_output=True, text=True)
    if candidate_probe.returncode == 0:
        subprocess.run(["docker", "stop", "--time", "10", candidate], capture_output=True)
        # No mounts are created for this disposable candidate; never use -v.
        subprocess.run(["docker", "rm", candidate], capture_output=True)
    for name in ["runtime.env", "build-public.env"]:
        (root / name).unlink(missing_ok=True)
    json_file(status_file, summary)
sys.exit(0 if summary["state"] == "passed" else 1)
