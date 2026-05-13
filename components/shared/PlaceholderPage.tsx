import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function Placeholder({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <div className="text-center py-20">
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500 mt-2">{desc}</p>
      <Link href={href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline">
        <ArrowLeft size={16} /> Kembali
      </Link>
    </div>
  );
}
