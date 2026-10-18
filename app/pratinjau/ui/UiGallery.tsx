"use client";

import * as React from "react";
import { BookOpen, Plus, Search, Trash2, Users, Sparkles } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, PremiumBadge, LiveBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function UiGallery() {
  const [tab, setTab] = React.useState("semua");
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  return (
    <main style={{ minHeight: "100vh", background: "var(--clr-bg)", color: "var(--clr-text)" }} className="px-4 py-6 sm:px-6">
      <div className="mx-auto grid max-w-3xl gap-5">
        <PageHeader
          icon={<BookOpen size={22} />}
          eyebrow="Kelas"
          title="Bahasa Indonesia VIII B"
          description="32 murid · 4 tugas aktif"
          actions={<><ThemeToggle /><Button variant="primary"><Plus size={18} aria-hidden="true" /> Buat tugas</Button></>}
        />

        <Card variant="surface" accent>
          <p className="ui-eyebrow">Tombol</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary">Gabung</Button>
            <Button variant="murid">Mulai</Button>
            <Button variant="secondary">Salin</Button>
            <Button variant="ghost">Batal</Button>
            <Button variant="quiet">Lainnya</Button>
            <Button variant="soft">Lihat</Button>
            <Button variant="danger"><Trash2 size={16} aria-hidden="true" /> Hapus</Button>
            <Button variant="premium">Coba Premium</Button>
            <Button variant="primary" loading>Menyimpan</Button>
            <Button variant="secondary" disabled>Nonaktif</Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm">Kecil</Button>
            <Button variant="primary" size="md">Sedang</Button>
            <Button variant="primary" size="lg">Besar</Button>
            <Button variant="secondary" size="icon" aria-label="Cari"><Search size={18} aria-hidden="true" /></Button>
            <a href="#" className={buttonClass({ variant: "ghost", size: "sm" })}>Tautan</a>
          </div>
          <div className="mt-3"><Button variant="primary" size="lg" block>Simpan perubahan</Button></div>
        </Card>

        <Card variant="surface">
          <p className="ui-eyebrow">Badge</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="neutral">Gratis</Badge>
            <Badge tone="accent">Guru</Badge>
            <Badge tone="violet">Murid</Badge>
            <Badge tone="info">Menunggu</Badge>
            <Badge tone="success">Lunas</Badge>
            <Badge tone="warning">Pemandu</Badge>
            <Badge tone="danger">Gagal</Badge>
            <Badge tone="brand">Baru</Badge>
            <PremiumBadge />
            <PremiumBadge label="Pro" />
            <LiveBadge />
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card variant="surface" interactive tabIndex={0}>
            <div className="flex items-center gap-3">
              <span className="ui-icon-box" aria-hidden="true"><Users size={20} /></span>
              <div className="min-w-0">
                <p className="ui-card__title">Kelas aktif</p>
                <p className="ui-card__desc">Kartu yang bisa diklik</p>
              </div>
            </div>
          </Card>
          <Card variant="tint">
            <div className="flex items-center gap-3">
              <span className="ui-icon-box ui-icon-box--murid" aria-hidden="true"><Sparkles size={20} /></span>
              <div className="min-w-0">
                <p className="ui-card__title">Kartu tint</p>
                <p className="ui-card__desc">Sorotan lembut</p>
              </div>
            </div>
          </Card>
        </div>

        <Card variant="surface">
          <p className="ui-eyebrow">Formulir</p>
          <div className="mt-3 grid gap-4">
            <Field label="Nama kelas" hint="Maks. 40 huruf">{(p) => <Input variant="bc" placeholder="Mis. VIII B" {...p} />}</Field>
            <Field label="Kode kelas" error="Kode tidak dikenali.">{(p) => <Input variant="bc" defaultValue="AB12" {...p} />}</Field>
            <Field label="Komunitas">{(p) => <Select {...p} defaultValue="0"><option value="0">Tanpa komunitas</option><option value="1">MGMP Kota</option></Select>}</Field>
            <Field label="Catatan">{(p) => <Textarea variant="bc" placeholder="Tulis catatan singkat" {...p} />}</Field>
          </div>
        </Card>

        <Tabs value={tab} onValueChange={setTab} variant="bc">
          <TabsList aria-label="Saring tugas">
            <TabsTrigger value="semua">Semua</TabsTrigger>
            <TabsTrigger value="aktif">Aktif</TabsTrigger>
            <TabsTrigger value="dinilai">Dinilai</TabsTrigger>
            <TabsTrigger value="arsip">Arsip</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-3">
            <div className="grid gap-3">
              <Alert tone="info" title="Tugas baru">Murid akan menerima notifikasi.</Alert>
              <Alert tone="success">Nilai tersimpan.</Alert>
              <Alert tone="warning">Batas paket hampir habis.</Alert>
              <Alert tone="danger" title="Gagal menyimpan">Coba lagi sebentar.</Alert>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setOpen(true)}>Buka modal</Button>
          <Button variant="secondary" onClick={() => toast({ tone: "success", title: "Tersimpan." })}>Tampilkan toast</Button>
        </div>

        <EmptyState icon={<BookOpen size={26} />} title="Belum ada tugas" description="Tugas yang kamu buat muncul di sini." action={<Button variant="primary" size="sm"><Plus size={16} aria-hidden="true" /> Buat tugas</Button>} />

        <div className="grid gap-3">
          <SkeletonCard />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      <Modal
        variant="bc"
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Hapus tugas?"
        description="Tugas dan nilainya tidak bisa dikembalikan."
        actions={<><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button variant="danger" onClick={() => setOpen(false)}>Hapus</Button></>}
      >
        <Alert tone="warning">3 murid sudah mengumpulkan.</Alert>
      </Modal>
    </main>
  );
}
