import {readdirSync,writeFileSync} from "node:fs";
import {join,relative} from "node:path";
const root=join(process.cwd(),"app"),routes=[];
function walk(dir){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  const file=join(dir,entry.name);
  if(entry.isDirectory()&&!entry.name.startsWith("_")&&!entry.name.startsWith("@"))walk(file);
  else if(entry.isFile()&&/^page\.(tsx|ts|jsx|js)$/.test(entry.name)){
   const path=relative(root,dir).split(/[\\/]/).filter(part=>part&&!part.startsWith("(")).join("/");
   routes.push("/"+path);
  }
 }
}
walk(root);
writeFileSync("lib/navigation/breadcrumb-routes.json",JSON.stringify([...new Set(routes)].sort(),null,2)+"\n");
console.log("Breadcrumb routes:",routes.length);
