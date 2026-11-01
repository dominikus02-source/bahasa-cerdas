#!/usr/bin/env bash
# Apply only the additive JUMPA stage column after verifying the production snapshot.
set -Eeuo pipefail
umask 077
[[ $EUID -eq 0 ]] || { echo 'STOP: run as root.' >&2; exit 1; }
LOCK=/tmp/bahasacerdas-deploy.lock
[[ -f "$LOCK" && ! -L "$LOCK" ]] || { echo 'STOP: deployment lock missing or symlinked.' >&2; exit 1; }
exec 9<"$LOCK"
flock -n 9 || { echo 'STOP: deployment/rollback in progress.' >&2; exit 1; }
python3 <<'PY'
import datetime,json,os,pathlib,re,subprocess,sys
from urllib.parse import urlparse,unquote

def run(args,**kwargs): return subprocess.run(args,check=True,**kwargs)
def capture(args): return subprocess.check_output(args,text=True).strip()
def stop(message): sys.exit('STOP: '+message)
backup=pathlib.Path('/opt/bahasacerdas/backups/jumpa-release/20261101T220745461582Z')
if backup.is_symlink() or not backup.is_dir(): stop('Verified production snapshot missing.')
run(['sha256sum','-c','SHA256SUMS'],cwd=backup)
m=json.loads((backup/'manifest.json').read_text())
if m['db_container']!='supabase-db' or m['database']!='postgres': stop('Unexpected production DB identity.')
web=json.loads(capture(['docker','inspect','bahasacerdas-prod-web-1']))[0]
if not web['State']['Running'] or web['Image']!=m['production_image_id']: stop('Production web changed since snapshot; take a new snapshot.')
run(['docker','image','inspect',m['rollback_image_tag']],stdout=subprocess.DEVNULL)
values=dict(item.split('=',1) for item in web['Config']['Env'] if '=' in item)
url=values.get('DIRECT_URL') or values.get('DATABASE_URL') or ''
u=urlparse(url)
if u.scheme not in ('postgres','postgresql') or unquote(u.path.lstrip('/'))!='postgres' or 'staging' in (u.hostname or ''):
    stop('Production connection does not match snapshot.')
db=json.loads(capture(['docker','inspect','supabase-db']))[0]
if 'postgres' not in db['Config']['Image'].lower(): stop('Unexpected DB container image.')
networks=db['NetworkSettings']['Networks'];web_nets=web['NetworkSettings']['Networks']
if u.hostname in ('127.0.0.1','localhost','103.242.10.81'): network='host'
else:
    candidates=[]
    for name,net in networks.items():
        aliases=set(net.get('Aliases') or [])|{'supabase-db',net.get('IPAddress','')}
        if name in web_nets and u.hostname in aliases: candidates.append(name)
    if len(candidates)!=1: stop('Cannot identify unique production database network.')
    network=candidates[0]
process_env=dict(os.environ,PGPASSWORD=unquote(u.password or ''),DATABASE_URL=url,DIRECT_URL=url)
pg=['docker','exec','-e','PGPASSWORD','supabase-db','psql','-X','-U',unquote(u.username or 'postgres'),'-d','postgres','-v','ON_ERROR_STOP=1']
def sql(query): return subprocess.check_output(pg+['-Atc',query],env=process_env,text=True).strip()
migration='20261031120000_jumpa_webinar_stage'
if sql("SELECT to_regclass('public._prisma_migrations') IS NOT NULL AND to_regclass('public.\"JumpaRoom\"') IS NOT NULL AND to_regclass('public.\"JumpaParticipant\"') IS NOT NULL")!='t':
    stop('Production migration ledger/JUMPA tables missing.')
if sql("SELECT count(*) FROM public._prisma_migrations WHERE migration_name='"+migration+"' AND finished_at IS NULL AND rolled_back_at IS NULL")!='0':
    stop('This migration has an unfinished Prisma record; inspect before continuing.')
cache='/opt/bahasacerdas/staging/jumpa/app'
sha=capture(['git','-c','safe.directory='+cache,'-C',cache,'rev-parse','FETCH_HEAD'])
if not re.fullmatch('[0-9a-f]{40}',sha): stop('Invalid candidate SHA.')
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
work=pathlib.Path('/opt/bahasacerdas/releases')/('jumpa-schema-'+stamp)
work.mkdir(parents=True,mode=0o700)
archive=work/'prisma.tar'
with archive.open('wb') as out: run(['git','-c','safe.directory='+cache,'-C',cache,'archive',sha,'prisma'],stdout=out)
run(['tar','-xf',str(archive),'-C',str(work)])
path=work/'prisma'/'migrations'/migration/'migration.sql'
if not path.is_file(): stop('Candidate migration missing.')
exists=sql("SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='JumpaParticipant' AND column_name='stageApproved'")=='1'
if not exists:
    ddl='''BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SET LOCAL search_path=public;
LOCK TABLE public."JumpaRoom" IN SHARE MODE;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public."JumpaRoom" WHERE status='LIVE') THEN
  RAISE EXCEPTION 'Active JUMPA room detected; migration cancelled';
 END IF;
END $$;
'''+path.read_text()+'\nCOMMIT;\n'
    command=pg.copy(); command.insert(2,'-i')
    run(command,input=ddl,text=True,env=process_env)
if sql("SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='JumpaParticipant' AND column_name='stageApproved' AND data_type='boolean' AND is_nullable='NO' AND column_default='false'")!='1':
    stop('Stage column verification failed; do not deploy.')
resolved=sql("SELECT count(*) FROM public._prisma_migrations WHERE migration_name='"+migration+"' AND finished_at IS NOT NULL AND rolled_back_at IS NULL")
if resolved=='0':
    # The DDL has been verified above; register the exact checked-in migration
    # using Prisma's supported resolve command, never hand-write ledger rows.
    run(['docker','run','--rm','--network',network,'-e','DATABASE_URL','-e','DIRECT_URL',
         '-v',str(work/'prisma')+':/work/prisma:ro','-w','/work','node:22-bookworm',
         'npx','--yes','prisma@5.22.0','migrate','resolve','--applied',migration,'--schema','prisma/schema.prisma'],env=process_env)
if sql("SELECT count(*) FROM public._prisma_migrations WHERE migration_name='"+migration+"' AND finished_at IS NOT NULL AND rolled_back_at IS NULL")!='1':
    stop('Prisma migration history verification failed; do not deploy.')
(work/'result.json').write_text(json.dumps({'candidate_sha':sha,'migration':migration,'backup_dir':str(backup),'stage_column_verified':True,'prisma_history_verified':True},indent=2)+'\n')
print('PASS: production stageApproved column and Prisma history verified. No application deployment performed.')
print('EVIDENCE='+str(work/'result.json'))
PY
