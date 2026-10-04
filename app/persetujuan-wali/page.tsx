import GuardianPanel from "@/components/compliance/GuardianPanel";
export const metadata={referrer:"no-referrer" as const,robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{token?:string}>}) { const {token}=await searchParams;return <main className="min-h-screen bg-background text-foreground p-5"><div className="mx-auto max-w-2xl space-y-6 py-10"><h1 className="text-3xl font-bold">Persetujuan orang tua / wali</h1><GuardianPanel token={token||""}/></div></main>; }
