import assert from "node:assert/strict";
import routes from "../lib/navigation/breadcrumb-routes.json";
import {pageBreadcrumbs,matchesBreadcrumbRoute} from "../lib/navigation/breadcrumbs";
for(const pattern of routes){
 const path=pattern.replace(/\[[^\]]+\]/g,"opaque-id-never-label"),items=pageBreadcrumbs(path);
 assert.ok(items.length);assert.equal(items.at(-1)?.href,undefined);
 assert.ok(!items.some(item=>item.label.includes("opaque-id-never-label")));
 for(const item of items)if(item.href)assert.ok(routes.some(route=>matchesBreadcrumbRoute(route,item.href!.split("/").filter(Boolean))),item.href);
}
assert.equal(pageBreadcrumbs("/artikel/opaque","Judul artikel").at(-1)?.label,"Judul artikel");
assert.ok(!JSON.stringify(pageBreadcrumbs("/t/opaque?token=secret")).includes("secret"));
console.log("BREADCRUMB_ROUTE_COVERAGE_PASS",routes.length);
