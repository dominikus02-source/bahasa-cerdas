import PrivacyPanel from "@/components/compliance/PrivacyPanel";
import Link from "next/link";
export default function Page() { return <main className="min-h-screen bg-background text-foreground p-5"><div className="mx-auto max-w-2xl space-y-6 py-8"><Link href="/" className="text-primary">BahasaCerdas</Link><h1 className="text-3xl font-bold">Privasi & perlindungan usia</h1><PrivacyPanel/></div></main>; }
