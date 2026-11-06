import assert from "node:assert/strict";
import routes from "../lib/navigation/breadcrumb-routes.json";
import {pageBreadcrumbs,matchesBreadcrumbRoute} from "../lib/navigation/breadcrumbs";
for(const pattern of routes){
 const pathname=pattern.replace(/\[[^\]]+\]/g,"opaque-id-never-label");
 const items=pageBreadcrumbs(pathname);
 assert.ok(items.length);
 assert.equal(items.at(-1)?.href,undefined);
 assert.ok(!items.some(item=>item.label.includes("opaque-id-never-label")));
 for(const item of items)if(item.href){
  assert.ok(item.href.startsWith("/")&&!item.href.includes("?"));
  assert.ok(routes.some(route=>matchesBreadcrumbRoute(route,item.href!.split("/").filter(Boolean))),item.href);
 }
}
assert.equal(pageBreadcrumbs("/artikel/opaque","Judul artikel yang sebenarnya").at(-1)?.label,"Judul artikel yang sebenarnya");
assert.ok(!JSON.stringify(pageBreadcrumbs("/t/opaque?token=super-secret")).includes("super-secret"));
assert.equal(pageBreadcrumbs("/guru/kuis/opaque/edit").find(item=>item.label==="Detail kuis")?.href,undefined);
console.log("BREADCRUMB_ROUTE_COVERAGE_PASS",routes.length);
