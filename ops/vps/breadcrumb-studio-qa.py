import hashlib,json,pathlib,secrets,subprocess,sys,time,urllib.parse
run=sys.argv[1];assert run.isdigit()
root=pathlib.Path("/opt/bc-book-studio-runtime/releases/breadcrumbs-fixed-20261106")
fixture=pathlib.Path("/tmp/breadcrumb-fixture-"+run+".json")
account=json.loads(fixture.read_text())
statefile=root/("qa-"+run+".json")
network="bcstudio-breadcrumb-qa-"+run;database="bcstudio-breadcrumb-db-"+run;app="bcstudio-breadcrumb-app-"+run
image="bc-book-studio:breadcrumbs-fixed-20261106"
prior=json.loads(subprocess.check_output(["docker","inspect","bc-book-studio-ui-canary-web-1"]))[0]
target=json.loads(subprocess.check_output(["docker","image","inspect",image]))[0]["Id"]
state={"network":network,"database":database,"app":app,"priorImage":prior["Image"],"priorTag":prior["Config"]["Image"],"testedImage":target}
statefile.write_text(json.dumps(state));statefile.chmod(0o600)
password=secrets.token_hex(24);env=root/("qa-"+run+".env")
env.write_text("POSTGRES_USER=bookstudio\nPOSTGRES_DB=bookstudio_qa\nPOSTGRES_PASSWORD="+password+"\n");env.chmod(0o600)
subprocess.run(["docker","network","create","--internal",network],check=True,capture_output=True)
subprocess.run(["docker","run","-d","--name",database,"--network",network,"--env-file",str(env),"postgres:16-alpine"],check=True,capture_output=True)
for attempt in range(40):
 if subprocess.run(["docker","exec",database,"pg_isready","-h","127.0.0.1","-U","bookstudio","-d","bookstudio_qa"],capture_output=True).returncode==0:break
 time.sleep(1)
else:raise RuntimeError("QA database readiness failed")
schema=subprocess.check_output(["docker","exec","bc-book-studio-runtime-db-1","pg_dump","--schema-only","--no-owner","--no-privileges","-U","bookstudio","-d","bookstudio"])
result=subprocess.run(["docker","exec","-i",database,"psql","-X","-v","ON_ERROR_STOP=1","-U","bookstudio","-d","bookstudio_qa"],input=schema,capture_output=True)
if result.returncode:raise RuntimeError("QA schema import failed: "+result.stderr.decode(errors="replace")[-2000:])
salt=secrets.token_hex(16)
hashed=salt+":"+hashlib.scrypt(account["password"].encode(),salt=salt.encode(),n=16384,r=8,p=1,dklen=64,maxmem=64*1024*1024).hex()
quote=lambda value:"'"+value.replace("'","''")+"'"
sql='INSERT INTO "StudioUser" (id,email,name,role,"passwordHash",active,"createdAt","updatedAt") VALUES ('+','.join([quote("breadcrumb-"+run),quote(account["email"]),quote("Breadcrumb QA"),quote("EDITOR"),quote(hashed),"true","NOW()","NOW()"])+');'
subprocess.run(["docker","exec","-i",database,"psql","-X","-v","ON_ERROR_STOP=1","-U","bookstudio","-d","bookstudio_qa"],input=sql.encode(),check=True,capture_output=True)
env.write_text("DATABASE_URL=postgresql://bookstudio:"+urllib.parse.quote(password,safe="")+"@"+database+":5432/bookstudio_qa?schema=public\n")
subprocess.run(["docker","run","-d","--name",app,"--network",network,"--env-file",str(env),"--security-opt","no-new-privileges:true",image],check=True,capture_output=True)
for attempt in range(30):
 probe=subprocess.run(["docker","exec",app,"node","-e",'fetch("http://127.0.0.1:3000/api/health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'],capture_output=True)
 if probe.returncode==0:break
 time.sleep(1)
else:raise RuntimeError("QA application readiness failed")
data=json.loads(subprocess.check_output(["docker","inspect",app]))[0]
state["address"]=data["NetworkSettings"]["Networks"][network]["IPAddress"]
statefile.write_text(json.dumps(state))
print(json.dumps({"address":state["address"],"run":run}))
