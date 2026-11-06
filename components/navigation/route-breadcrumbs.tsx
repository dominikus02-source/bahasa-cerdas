"use client";
import {usePathname} from "next/navigation";
import BreadcrumbTrail from "./breadcrumb-trail";
import {pageBreadcrumbs} from "../../lib/navigation/breadcrumbs";
import styles from "./breadcrumb-trail.module.css";

/** Layout-owned navigation; no DOM mutation, portals or global observers. */
export default function RouteBreadcrumbs(){
 const pathname=usePathname()||"/";
 const items=pageBreadcrumbs(pathname,"");
 if(items.length<2)return null;
 return <div className={styles.host} data-breadcrumb-host="true"><BreadcrumbTrail items={items}/></div>;
}
