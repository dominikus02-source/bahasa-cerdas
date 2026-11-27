import Link from "next/link";
import { ArrowDown, BookOpen, Mail, MapPin } from "lucide-react";
import { COMPANY } from "@/lib/company";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const series = [
  { title: "Terang Kata", level: "SD", grades: ["1", "2", "3", "4", "5", "6"] },
  { title: "Jelajah Kata", level: "SMP", grades: ["7", "8", "9"] },
  { title: "Cakrawala Kata", level: "SMA", grades: ["10", "11", "12"] },
] as const;

export default function PublisherPublications() {
  return (
    <section id="publikasi" className="scroll-mt-24" aria-labelledby="judul-publikasi">
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-24 sm:px-6 lg:px-8 lg:pt-28">
        <p id="judul-publikasi" className="sr-only">Publikasi {COMPANY.legalName}</p>
        <PageHeader
          title="Publikasi"
          eyebrow="Buku Bahasa Indonesia"
          description="Profil penerbit dan katalog buku yang sedang disiapkan."
          icon={<BookOpen size={24} />}
          actions={
            <Link href="#toko-karya" className={buttonClass({ variant: "secondary", size: "md" })}>
              Ke Toko Karya <ArrowDown size={16} aria-hidden="true" />
            </Link>
          }
        />

        <Card as="section" variant="tint" className="mt-5" aria-labelledby="profil-penerbit">
          <p className="ui-eyebrow">Profil penerbit</p>
          <h2 id="profil-penerbit" className="mt-1 text-bc-h2 font-semibold text-bc-text">{COMPANY.legalName}</h2>
          <p className="mt-2 max-w-3xl text-bc-body text-bc-text-2">
            Kami menyiapkan buku pembelajaran Bahasa Indonesia untuk SD, SMP, dan SMA. Teras Kata adalah merek penerbitan kami.
          </p>
          <address className="mt-4 flex flex-col gap-2 text-bc-small not-italic text-bc-text-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
            <span className="flex items-start gap-2">
              <MapPin className="mt-0.5 shrink-0" size={16} aria-hidden="true" /> {COMPANY.address}
            </span>
            <a href={`mailto:${COMPANY.email}`} className="flex items-center gap-2 self-start rounded-bc-xs font-medium text-bc-accent-strong hover:underline focus-ring">
              <Mail className="shrink-0" size={16} aria-hidden="true" /> {COMPANY.email}
            </a>
          </address>
        </Card>

        <div className="mb-3 mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-bc-h2 font-semibold text-bc-text">Katalog buku</h2>
          <Badge tone="neutral">Dalam persiapan terbit</Badge>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Seri buku Bahasa Indonesia">
          {series.map(({ title, level, grades }) => (
            <li key={title}>
              <Card as="article" variant="surface" className="h-full">
                <Badge tone="info">{level}</Badge>
                <h3 className="mt-2 text-bc-h3 font-semibold text-bc-text">{title}</h3>
                <p className="mt-1 text-bc-small text-bc-text-2">Buku Bahasa Indonesia</p>
                <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Kelas dalam seri ${title}`}>
                  {grades.map((grade) => (
                    <li key={grade}><Badge tone="neutral">Kelas {grade}</Badge></li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-bc-small text-bc-text-2">
          Katalog ini memuat rencana terbit. Buku belum tersedia untuk dibeli di halaman ini.
        </p>
      </div>
    </section>
  );
}
