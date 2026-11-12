"use client";
import Link from "next/link";
import {ChevronRight} from "lucide-react";
import styles from "./breadcrumb-trail.module.css";
export type BreadcrumbItem={label:string;href?:string};
export default function BreadcrumbTrail({items}:{items:BreadcrumbItem[]}){
 if(!items.length)return null;
 return <nav aria-label="Jejak navigasi" className={styles.trail}><ol>{items.map((item,index)=><li key={index}>
  {index>0&&<ChevronRight size={14} aria-hidden="true" className={styles.separator}/>}
  {index<items.length-1&&item.href?<Link href={item.href} prefetch={false}>{item.label}</Link>:<span aria-current={index===items.length-1?"page":undefined}>{item.label}</span>}
 </li>)}</ol></nav>;
}
