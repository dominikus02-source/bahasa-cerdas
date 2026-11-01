#!/usr/bin/env bash
# Rehearse staging Auth/Storage recovery into NEW, network-disabled containers.
# Existing containers, DBs, volumes and records are never replaced or deleted.
set -Eeuo pipefail
umask 077
[[ $EUID -eq 0 ]] || { echo 'STOP: run as root.' >&2; exit 1; }
ROOT=/opt/bahasacerdas/staging/auth
[[ -d "$ROOT" && ! -L "$ROOT" ]] || { echo 'STOP: staging Auth root unavailable.' >&2; exit 1; }
exec 9>"$ROOT/restore-rehearsal.lock"
flock -n 9 || { echo 'STOP: restore rehearsal already running.' >&2; exit 1; }
python3 <<'PY'
import datetime,hashlib,json,os,pathlib,secrets,subprocess,sys,tarfile,time
root=pathlib.Path('/opt/bahasacerdas/staging/auth')
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S%f')
work=root/('restore-rehearsal-'+stamp);work.mkdir(mode=0o700)
log=(work/'operations.log').open('w')
created=[]; sessions=[]

def run(args,**kwargs):
    kwargs.setdefault('stdout',log);kwargs.setdefault('stderr',log)
    return subprocess.run(args,check=True,**kwargs)
def capture(args,**kwargs):
    return subprocess.check_output(args,text=True,stderr=log,**kwargs).strip()
def inspect(name): return json.loads(capture(['docker','inspect',name]))[0]
def stop(message): raise RuntimeError(message)
def qi(name): return '"'+name.replace('"','""')+'"'
def ql(value): return "'"+value.replace("'","''")+"'"
def prefix(name,user,db): return ['docker','exec','-i',name,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',user,'-d',db]
def sql(conn,query,snapshot=None):
    if snapshot:
        query='BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET TRANSACTION SNAPSHOT '+ql(snapshot)+'; '+query+'; COMMIT;'
    return capture(conn,input="SET TIME ZONE 'UTC'; "+query)
def fingerprint(conn,snapshot=None):
    tables=json.loads(sql(conn,"SELECT COALESCE(json_agg(x ORDER BY x.s,x.t),'[]') FROM (SELECT schemaname s,tablename t FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') AND schemaname NOT LIKE 'pg_%') x",snapshot))
    if not tables: stop('No restored application/Auth/Storage tables found')
    parts=[]
    for item in tables:
        name=item['s']+'.'+item['t']; table=qi(item['s'])+'.'+qi(item['t'])
        parts.append('SELECT '+ql(name)+" AS k,count(*) AS n,md5(COALESCE(string_agg(h,'' ORDER BY h),'')) AS d FROM (SELECT md5(row_to_json(t)::text) AS h FROM "+table+' t) row_hashes')
    return json.loads(sql(conn,"SELECT json_object_agg(k,json_build_object('rows',n,'digest',d)) FROM ("+' UNION ALL '.join(parts)+') table_checks',snapshot))
def mount_check(info,volume,destination):
    return any(m.get('Name')==volume and m.get('Destination')==destination for m in info.get('Mounts',[]))
try:
    sources=[('auth','jumpa-auth-db-staging','gotrue','gotrue','jumpa_auth_staging_db'),('storage','jumpa-storage-db-staging','postgres','storage','jumpa_storage_staging_db')]
    infos={}
    for label,name,user,db,volume in sources:
        info=inspect(name)
        if not info['State']['Running'] or not mount_check(info,volume,'/var/lib/postgresql/data'): stop('Unexpected staging source DB/volume: '+name)
        infos[label]=info
    storage_info=inspect('jumpa-storage-staging')
    if not mount_check(storage_info,'jumpa_storage_staging_files','/var/lib/storage'): stop('Unexpected staging object volume')
    results={}; expected={}
    for label,name,user,db,volume in sources:
        conn=prefix(name,user,db)
        tx=subprocess.Popen(conn,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=log,text=True)
        sessions.append(tx)
        tx.stdin.write('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_export_snapshot();\n');tx.stdin.flush()
        snapshot=tx.stdout.readline().strip()
        if not snapshot: stop('Snapshot export failed: '+label)
        dump=work/(label+'.dump')
        with dump.open('wb') as out:
            run(['docker','exec',name,'pg_dump','-U',user,'-d',db,'-Fc','--snapshot='+snapshot],stdout=out)
        expected[label]=fingerprint(conn,snapshot)
        (work/(label+'-expected.json')).write_text(json.dumps(expected[label],sort_keys=True))
        # Restore ACLs/policies too. Recreate referenced DB role names as NOLOGIN
        # groups, without copying role passwords or superuser privileges.
        role_sql=sql(conn,"SELECT COALESCE(string_agg(format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;',rolname),E'\\n'),'') FROM pg_roles WHERE rolname NOT LIKE 'pg_%' AND rolname <> "+ql(user),snapshot)
        tx.stdin.write('ROLLBACK;\n');tx.stdin.flush();tx.communicate(timeout=20);sessions.remove(tx)
        target='jumpa-restore-'+label+'-'+stamp
        target_volume='jumpa_restore_'+label+'_'+stamp
        if subprocess.run(['docker','volume','inspect',target_volume],stdout=log,stderr=log).returncode==0: stop('Rehearsal volume already exists')
        run(['docker','volume','create','--label','purpose=jumpa-staging-restore',target_volume])
        env_file=work/(label+'.env')
        env_file.write_text('POSTGRES_USER='+user+'\nPOSTGRES_DB='+db+'\nPOSTGRES_PASSWORD='+secrets.token_hex(32)+'\n');env_file.chmod(0o600)
        run(['docker','run','-d','--name',target,'--network','none','--label','purpose=jumpa-staging-restore','--security-opt','no-new-privileges:true','--env-file',str(env_file),'-v',target_volume+':/var/lib/postgresql/data',infos[label]['Image']])
        created.append(target)
        ready=False
        for attempt in range(90):
            if subprocess.run(['docker','exec',target,'pg_isready','-h','127.0.0.1','-U',user,'-d',db],stdout=log,stderr=log).returncode==0: ready=True;break
            time.sleep(2)
        if not ready: stop('Rehearsal DB not ready: '+label)
        target_info=inspect(target)
        if target_info['HostConfig']['NetworkMode']!='none' or target_info['HostConfig'].get('PortBindings'): stop('Unexpected rehearsal network/ports')
        if role_sql: sql(prefix(target,user,db),role_sql)
        with dump.open('rb') as inp:
            run(['docker','exec','-i',target,'pg_restore','-U',user,'-d',db,'--exit-on-error','--no-owner'],stdin=inp)
        actual=fingerprint(prefix(target,user,db))
        (work/(label+'-restored.json')).write_text(json.dumps(actual,sort_keys=True))
        if actual!=expected[label]: stop('Restored row-count/content fingerprints differ: '+label)
        results[label]={'container':target,'volume':target_volume,'tables':len(actual),'rows':sum(x['rows'] for x in actual.values()),'row_fingerprints_match':True,'network':'none','published_ports':0}
        print('PASS: '+label+' restore; '+str(len(actual))+' tables, all row counts/content fingerprints match',flush=True)
    archive=work/'storage-files.tar.gz'
    run(['docker','run','--rm','--network','none','-v','jumpa_storage_staging_files:/data:ro','-v',str(work)+':/backup','alpine:3.20','sh','-ec','tar -czf /backup/storage-files.tar.gz -C /data .'])
    files={}
    with tarfile.open(archive,'r:gz') as tar:
        for member in tar.getmembers():
            path=pathlib.PurePosixPath(member.name)
            if path.is_absolute() or '..' in path.parts or member.issym() or member.islnk(): stop('Unsafe object archive path/type')
            if member.isfile():
                h=hashlib.sha256()
                with tar.extractfile(member) as data:
                    for chunk in iter(lambda:data.read(1024*1024),b''): h.update(chunk)
                files[str(path)]=h.hexdigest()
            elif not member.isdir(): stop('Unsupported object archive entry')
    files_volume='jumpa_restore_files_'+stamp
    if subprocess.run(['docker','volume','inspect',files_volume],stdout=log,stderr=log).returncode==0: stop('Rehearsal object volume exists')
    run(['docker','volume','create','--label','purpose=jumpa-staging-restore',files_volume])
    run(['docker','run','--rm','--network','none','-v',files_volume+':/target','-v',str(work)+':/backup:ro','alpine:3.20','tar','-xzf','/backup/storage-files.tar.gz','-C','/target'])
    js="const fs=require('fs'),p=require('path'),c=require('crypto');let out={};function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){let f=p.join(d,e.name);if(e.isSymbolicLink())throw Error('symlink');if(e.isDirectory())walk(f);else if(e.isFile())out[p.relative('/data',f)]=c.createHash('sha256').update(fs.readFileSync(f)).digest('hex');else throw Error('unsupported');}}walk('/data');console.log(JSON.stringify(out));"
    restored=json.loads(capture(['docker','run','--rm','--network','none','-v',files_volume+':/data:ro','node:22-alpine','node','-e',js]))
    if restored!=files: stop('Restored object SHA256 fingerprints differ')
    results['objects']={'volume':files_volume,'files':len(files),'sha256_match':True}
    print('PASS: object restore; '+str(len(files))+' files, all SHA256 match',flush=True)
    (work/'result.json').write_text(json.dumps(results,indent=2)+'\n')
    with (work/'SHA256SUMS').open('w') as sums:
        for path in sorted(work.iterdir()):
            if path.suffix not in ('.dump','.gz','.json'): continue
            h=hashlib.sha256()
            with path.open('rb') as data:
                for chunk in iter(lambda:data.read(1024*1024),b''):h.update(chunk)
            sums.write(h.hexdigest()+'  '+path.name+'\n')
    run(['sha256sum','-c','SHA256SUMS'],cwd=work)
    print('PASS: isolated staging DB/object restore rehearsal. This does not claim API/browser restore acceptance.',flush=True)
    print('EVIDENCE='+str(work),flush=True)
except Exception as error:
    print('STOP: '+str(error) if isinstance(error,RuntimeError) else 'STOP: '+type(error).__name__+'; inspect private operations.log',file=sys.stderr)
    print('EVIDENCE='+str(work),file=sys.stderr)
    sys.exit(1)
finally:
    for tx in sessions:
        try:tx.communicate('ROLLBACK;\n',timeout=10)
        except Exception:tx.terminate()
    for name in created:
        subprocess.run(['docker','stop','--time','20',name],stdout=log,stderr=log)
    log.close()
PY
