import ReportForm from "@/components/compliance/ReportForm";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
export default function Page(){return <main className="min-h-screen bg-background text-foreground"><PageNavbar/><div className="mx-auto max-w-2xl p-5 py-12 space-y-6"><h1 className="text-3xl font-bold">Laporkan konten & masalah privasi</h1><ReportForm/></div><PageFooter/></main>;}
