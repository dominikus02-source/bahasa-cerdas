#!/usr/bin/env bash
# Snapshot the actual production DB, config and web image before a JUMPA release.
# Does not migrate, deploy, prune, modify runtime env, or stop services.
set -Eeuo pipefail
umask 077
[[ $EUID -eq 0 ]] || { echo 'STOP: run as root.' >&2; exit 1; }
# Open the existing shared inode without O_CREAT/O_TRUNC. This also works
# under Linux fs.protected_regular when the lock belongs to bcadmin.
LOCK=/tmp/bahasacerdas-deploy.lock
[[ -f "$LOCK" && ! -L "$LOCK" ]] || { echo 'STOP: expected deployment lock missing or symlinked; inspect before proceeding.' >&2; exit 1; }
exec 9<"$LOCK"
flock -n 9 || { echo 'STOP: deployment/rollback in progress.' >&2; exit 1; }
python3 <<'PY'
import datetime, hashlib, json, os, pathlib, shutil, subprocess, sys
from urllib.parse import urlparse, unquote

def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)
def capture(args):
    return subprocess.check_output(args,text=True).strip()
def stop(message):
    sys.exit('STOP: '+message)
repo='/opt/bahasacerdas/apps/bahasa-cerdas'
config=pathlib.Path('/opt/bahasacerdas/config')
web='bahasacerdas-prod-web-1'
info=json.loads(capture(['docker','inspect',web]))[0]
if not info['State']['Running']: stop('Production web is not running.')
env=dict(item.split('=',1) for item in info['Config']['Env'] if '=' in item)
u=urlparse(env.get('DIRECT_URL') or env.get('DATABASE_URL') or '')
if u.scheme not in ('postgres','postgresql') or not u.hostname or not u.path.strip('/'):
    stop('Cannot identify production database from running web config.')
if 'staging' in u.hostname or 'staging' in u.path:
    stop('Running production web points at a staging-named database; inspect before release.')
for key in ('NEXT_PUBLIC_SUPABASE_AUTH_URL','NEXT_PUBLIC_SUPABASE_STORAGE_URL','SUPABASE_STORAGE_URL'):
    if 'staging' in env.get(key,''): stop('Production uses staging endpoint: '+key)
ids=capture(['docker','ps','-q']).splitlines()
containers=json.loads(capture(['docker','inspect',*ids]))
web_nets=set(info['NetworkSettings']['Networks'])
port=u.port or 5432
matches=[]
for item in containers:
    if 'postgres' not in item['Config']['Image'].lower(): continue
    nets=item['NetworkSettings']['Networks']
    names={item['Name'].lstrip('/'),item['Config'].get('Hostname','')}
    for net in web_nets & set(nets):
        names.update(nets[net].get('Aliases') or [])
        names.add(nets[net].get('IPAddress',''))
    direct=(u.hostname in names and bool(web_nets & set(nets)))
    published=any(int(binding['HostPort'])==port for binding in (item['NetworkSettings'].get('Ports') or {}).get('5432/tcp',[]) or [])
    local_published=u.hostname in ('127.0.0.1','localhost','103.242.10.81') and published
    if direct or local_published: matches.append(item)
if len(matches)!=1: stop('Cannot uniquely map production DB host/port to a running Postgres container; no deployment performed.')
db=matches[0]['Name'].lstrip('/')
if 'staging' in db: stop('Mapped database container is staging; no changes made.')
username=unquote(u.username or 'postgres'); database=unquote(u.path.lstrip('/'))
process_env=dict(os.environ,PGPASSWORD=unquote(u.password or ''))
prefix=['docker','exec','-e','PGPASSWORD',db]
def sql(query):
    return subprocess.check_output(prefix+['psql','-X','-U',username,'-d',database,'-At','-v','ON_ERROR_STOP=1','-c',query],env=process_env,text=True).strip()
if sql("SELECT to_regclass('public.\"User\"') IS NOT NULL")!='t':
    stop('Target database lacks the application User table.')
sha=capture(['git','-c','safe.directory='+repo,'-C',repo,'rev-parse','HEAD'])
branch=capture(['git','-c','safe.directory='+repo,'-C',repo,'branch','--show-current'])
if branch!='main': stop('Production checkout is not main; inspect before release.')
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
root=pathlib.Path('/opt/bahasacerdas/backups/jumpa-release')
if root.is_symlink(): stop('Backup root must not be a symlink.')
root.mkdir(mode=0o700,parents=True,exist_ok=True)
root.chmod(0o700)
target=root/stamp;target.mkdir(mode=0o700)
db_size=int(sql('SELECT pg_database_size(current_database())'))
if shutil.disk_usage(target).free < db_size*2+512*1024*1024:
    stop('Insufficient backup disk space.')
# Write secrets only to root-private backup files. Never print DATABASE_URL.
with (target/'application.dump').open('wb') as out:
    run(prefix+['pg_dump','-U',username,'-d',database,'-Fc'],env=process_env,stdout=out)
with (target/'application.dump').open('rb') as inp:
    run(['docker','exec','-i',db,'pg_restore','--list'],stdin=inp,stdout=subprocess.DEVNULL)
if not (config/'web.env').is_file() or not (config/'stack.env').is_file():
    stop('Production config missing; DB backup retained.')
run(['tar','-C','/opt/bahasacerdas','-czf',str(target/'config.tgz'),'config'])
image=info['Image']; tag='bahasacerdas/web:pre-jumpa-'+stamp.lower()
run(['docker','tag',image,tag])
has_rooms=sql("SELECT to_regclass('public.\"JumpaRoom\"') IS NOT NULL")=='t'
active=int(sql('SELECT count(*) FROM public."JumpaRoom" WHERE status=\'LIVE\'')) if has_rooms else 0
stage_ready=sql("SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='JumpaParticipant' AND column_name='stageApproved'")=='1'
manifest={'utc':stamp,'production_git_sha':sha,'production_image_id':image,'rollback_image_tag':tag,'db_container':db,'database':database,'application_bytes':db_size,'jumpa_tables_present':has_rooms,'stage_approval_column_present':stage_ready,'active_jumpa_rooms':active,'livekit_configured':bool(env.get('LIVEKIT_API_KEY') and env.get('LIVEKIT_API_SECRET')),'jumpa_flag':env.get('NEXT_PUBLIC_JUMPA_ENABLED','unset')}
(target/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
with (target/'SHA256SUMS').open('w') as out:
    for path in sorted(target.iterdir()):
        if path.name=='SHA256SUMS': continue
        h=hashlib.sha256()
        with path.open('rb') as data:
            for chunk in iter(lambda:data.read(1024*1024),b''): h.update(chunk)
        out.write(h.hexdigest()+'  '+path.name+'\n')
for path in target.iterdir(): path.chmod(0o600)
run(['sha256sum','-c','SHA256SUMS'],cwd=target)
print(json.dumps(manifest,indent=2))
print('BACKUP_DIR='+str(target))
print('PASS: production snapshot and rollback image saved. No deployment or migration performed.')
if active: print('HOLD: active JUMPA rooms exist; do not restart services during these sessions.')
PY
