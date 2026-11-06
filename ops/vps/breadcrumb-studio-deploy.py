import pathlib,subprocess,json,time,urllib.request,sys
run=sys.argv[1];assert run.isdigit()
root=pathlib.Path("/opt/bc-book-studio-runtime/releases/breadcrumbs-fixed-20261106")
state=json.loads((root/("qa-"+run+".json")).read_text())
name="bc-book-studio-ui-canary-web-1";image="bc-book-studio:breadcrumbs-fixed-20261106"
data=json.loads(subprocess.check_output(["docker","inspect",name]))[0]
assert data["Image"]==state["priorImage"],"Live image changed since QA started"
assert json.loads(subprocess.check_output(["docker","image","inspect",image]))[0]["Id"]==state["testedImage"],"Tested image changed"
route=subprocess.check_output(["docker","exec","bahasacerdas-prod-caddy-1","cat","/etc/caddy/conf.d/bcbookstudio.caddy"],text=True)
assert "reverse_proxy "+name+":3000" in route,"Public route changed"
config=pathlib.Path(data["Config"]["Labels"]["com.docker.compose.project.config_files"])
original=config.read_bytes();text=original.decode()
assert "image: "+state["priorTag"] in text
backup=config.with_name(config.name+".before-breadcrumb-"+run);backup.write_bytes(original);backup.chmod(0o600)
base=["docker","compose","--project-name",data["Config"]["Labels"]["com.docker.compose.project"],"--env-file","/opt/bc-book-studio-runtime/source/.env","-f",str(config)]
try:
 config.write_text(text.replace("image: "+state["priorTag"],"image: "+image,1))
 proposed=json.loads(subprocess.check_output(base+["config","--format","json"]))["services"]["web"]
 oldenv=dict(item.split("=",1) for item in data["Config"]["Env"] if "=" in item)
 assert all(str(value)==oldenv.get(key) for key,value in proposed["environment"].items()),"Environment changed"
 subprocess.run(base+["up","-d","--no-deps","--pull","never","web"],capture_output=True,check=True,timeout=120)
 for attempt in range(40):
  try:
   with urllib.request.urlopen("http://127.0.0.1:3151/api/health",timeout=3) as response:
    if response.status==200:break
  except Exception:pass
  time.sleep(2)
 else:raise RuntimeError("Release health failed")
 print("BCSTUDIO_BREADCRUMB_DEPLOY_HEALTHY")
except Exception:
 config.write_bytes(original)
 subprocess.run(base+["up","-d","--no-deps","--pull","never","web"],capture_output=True,timeout=120)
 print("BCSTUDIO_BREADCRUMB_ROLLED_BACK")
 raise
