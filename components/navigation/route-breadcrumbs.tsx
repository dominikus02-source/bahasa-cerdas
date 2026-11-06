"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {usePathname} from "next/navigation";
import BreadcrumbTrail from "./breadcrumb-trail";
import {pageBreadcrumbs} from "../../lib/navigation/breadcrumbs";
import styles from "./breadcrumb-trail.module.css";
export default function RouteBreadcrumbs(){
 const pathname=usePathname()||"/";
 const fallback=useRef<HTMLDivElement>(null);
 const [host,setHost]=useState<HTMLElement|null>(null);
 const [heading,setHeading]=useState("");
 useEffect(()=>{
  // The landing page has its own fixed navbar and does not need a breadcrumb.
  if(pathname==="/"){setHost(null);return;}
  const container=document.createElement("div");
  container.className=styles.host;container.dataset.breadcrumbHost="true";
  let frame=0;
  const update=()=>{
   frame=0;
   const main=document.querySelector("main")||document.querySelector('[role="main"]');
   const target=main||fallback.current;
   if(target){
    const header=target.querySelector(":scope > header");
    if(header){if(header.nextElementSibling!==container)header.after(container);}
    else if(target.firstElementChild!==container)target.prepend(container);
   }
   const title=main?.querySelector("[data-breadcrumb-title]")||main?.querySelector("h1")||main?.querySelector("h2");
   const label=title?.textContent?.replace(/\s+/g," ").trim()||"";
   setHeading(previous=>previous===label?previous:label);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const observer=new MutationObserver(records=>{
   if(records.some(record=>!container.contains(record.target)))schedule();
  });
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  update();setHost(container);
  return()=>{observer.disconnect();cancelAnimationFrame(frame);container.remove();};
 },[pathname]);
 const items=pageBreadcrumbs(pathname,heading);
 return <><div ref={fallback} className={styles.fallback}/>{pathname!=="/"&&host&&createPortal(<BreadcrumbTrail items={items}/>,host)}</>;
}
