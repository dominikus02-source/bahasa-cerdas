"use client";
// ─── Setup Guru (Tahap 8A — visual polish) ───────────────────
// Flow 3 langkah dalam SATU halaman (§6): pilih paket → cara
// bermain → kelas → Buka Ruang. Kompatibilitas paket tetap via API
// (sumber Tahap 5); subset eksplisit hanya bila caller sadar ada
// soal tak didukung. Sesi dibuat via POST commands — logic backend
// TIDAK berubah (§34).

import { useCallback, useEffect, useMemo, useState } from 'react';
import QuestionPackageEditor from './QuestionPackageEditor';
import QuestionPackageLibrary from './QuestionPackageLibrary';
import QuestionPreview, { type PreviewQuestion } from './QuestionPreview';
import { JELAJAH_TEAM_KEYS, JELAJAH_DEFAULT_TEAMS } from '@/src/main-bersama/domain/entities/team';
import { useRouter } from 'next/navigation';
import type { GameMode } from '@/src/main-bersama/domain/types/session';
import { ModeCard } from '@/components/main-bersama/shared/ModeCard';
import { PrimaryGameButton } from '@/components/main-bersama/shared/PrimaryGameButton';
import { MbApiError, postTeacherCommand } from '@/lib/main-bersama/api-client';
import { ArrowRight, BookOpen, Check, ChevronRight, Eye, Gamepad2, Info, Monitor, Sparkles, Users } from 'lucide-react';
import { TeamMascot } from '@/components/main-bersama/art/registry';
import styles from './setup.module.css';

export interface SetupPackage {
  id: string;
  title: string;
  kelas: string;
  questionCount: number;
  isPublic?: boolean;
  isOwner?: boolean;
  creatorName?: string;
}
export interface SetupClass {
  id: string;
  name: string;
}

/**
 * Tema Bank Soal yang dipilih guru lewat tombol "Gunakan untuk Main
 * Bersama" (Tahap 8A.3). Referensi sumber — BUKAN paket baru, jadi
 * tidak ada SoalSet/Soal duplikat yang dibuat.
 */
export interface SetupThemeSelection {
  topic: string;
  count: number;
  difficulty: string | null;
  seed?: string;
}

interface CompatibilityInfo {
  total: number;
  supported: number;
  /** Jumlah soal yang diminta guru (null untuk paket SoalSet). */
  requested?: number | null;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  MUDAH: 'Mudah',
  SEDANG: 'Sedang',
  SULIT: 'Sulit',
};

/** Kunci cache kompatibilitas untuk satu pilihan tema. */
function themeCacheKey(sel: SetupThemeSelection): string {
  return `theme:${sel.topic}|${sel.count}|${sel.difficulty ?? ''}|${sel.seed ?? ''}`;
}

export function SetupClient({
  packages: initialPackages,
  classes,
  preselectedTheme,
}: {
  teacherName?: string;
  packages: SetupPackage[];
  classes: SetupClass[];
  preselectedTheme?: SetupThemeSelection | null;
}) {
  const router = useRouter();
  const [packages, setPackages] = useState(initialPackages);
  const [libraryRevision, setLibraryRevision] = useState(0);
  const mergePackages = useCallback((loaded: SetupPackage[]) => {
    setPackages(current => [...new Map([...current, ...loaded].map(item => [item.id, item])).values()]);
  }, []);
  const [packageId, setPackageId] = useState<string | null>(null);
  // Tema Bank Soal hasil handoff "Gunakan untuk Main Bersama" (boleh null).
  const [themeSel, setThemeSel] = useState<SetupThemeSelection | null>(
    preselectedTheme ?? null,
  );
  const [mode, setMode] = useState<GameMode | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [compat, setCompat] = useState<Record<string, CompatibilityInfo>>({});
  const [checking, setChecking] = useState(false);
  const [opening, setOpening] = useState(false);
  const [durationMin, setDurationMin] = useState(10);
  const [teamCount, setTeamCount] = useState(4);
  const [maxMembersPerTeam, setMaxMembersPerTeam] = useState(8);
  const [estimatedStudents, setEstimatedStudents] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ title: string; questions: PreviewQuestion[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const themeKey = themeSel ? themeCacheKey(themeSel) : null;
  const selectedKey = themeKey ?? packageId;
  const selectedCompat = selectedKey ? compat[selectedKey] ?? null : null;
  // `requested` = permintaan guru untuk tema Bank Soal; paket SoalSet
  // memakai total paket apa adanya (perilaku lama tidak berubah).
  const requestedCount = selectedCompat?.requested ?? selectedCompat?.total ?? null;
  const partial =
    selectedCompat !== null && requestedCount !== null && selectedCompat.supported < requestedCount;
  const zero = selectedCompat !== null && selectedCompat.supported === 0;

  const capacityShort = mode === 'jelajah-kata' && estimatedStudents > teamCount * maxMembersPerTeam;
  const suggestedTeams = Math.ceil(estimatedStudents / maxMembersPerTeam);
  const canOpen = useMemo(
    () => Boolean(selectedKey && mode && !checking && !opening && !zero && !capacityShort),
    [selectedKey, mode, checking, opening, zero, capacityShort],
  );

  /** Alasan CTA mati — disabled harus menjelaskan (§12). */
  const disabledReason = useMemo(() => {
    if (!selectedKey) return 'Pilih soal dulu.';
    // Sumber tanpa soal yang bisa dimainkan disebut LEBIH DULU daripada
    // "pilih cara bermain": mengganti mode tidak akan menolongnya.
    if (zero) return 'Belum ada soal yang bisa dimainkan dari paket ini. Pilih tema atau paket lain.';
    if (!mode) return 'Pilih cara bermain.';
    if (capacityShort) return 'Kapasitas regu kurang untuk perkiraan siswa. Tambah regu atau tingkatkan kapasitas.';
    return null;
  }, [selectedKey, mode, zero, capacityShort]);

  /**
   * Cek kompatibilitas sumber terpilih (read-only, sumber Tahap 5).
   * `ref` = packageRef BERTIPE — bentuk yang sama dipakai create-session,
   * sehingga angka di layar == yang benar-benar dimainkan.
   */
  async function checkCompatibility(cacheKey: string, ref: Record<string, unknown>) {
    setError(null);
    if (compat[cacheKey]) return; // sudah dicek — cache lokal sesi.
    setChecking(true);
    try {
      const res = await fetch('/api/main-bersama/teacher/package-compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageRef: ref }),
      });
      if (!res.ok) throw new Error('compat');
      const body = (await res.json()) as CompatibilityInfo;
      setCompat((prev) => ({ ...prev, [cacheKey]: body }));
    } catch {
      // Gagal cek → biarkan tanpa info; create-session tetap memvalidasi.
      setCompat((prev) => ({ ...prev, [cacheKey]: { total: 0, supported: 0 } }));
    } finally {
      setChecking(false);
    }
  }

  function selectPackage(id: string) {
    setThemeSel(null); // paket dan tema saling eksklusif
    setPackageId(id);
    void checkCompatibility(id, { kind: 'SOAL_SET', soalSetId: id });
  }

  /** Kompatibilitas tema yang baru masuk dari handoff dicek otomatis. */
  useEffect(() => {
    if (!preselectedTheme) return;
    void checkCompatibility(themeCacheKey(preselectedTheme), {
      kind: 'BANK_THEME',
      topic: preselectedTheme.topic,
      count: preselectedTheme.count,
      difficulty: preselectedTheme.difficulty,
      ...(preselectedTheme.seed ? { seed: preselectedTheme.seed } : {}),
    });
    // Cukup sekali per tema yang diteruskan — `compat` sengaja tidak jadi dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedTheme?.topic, preselectedTheme?.count, preselectedTheme?.difficulty, preselectedTheme?.seed]);

  async function previewSelected() {
    if (!selectedKey) return;
    setPreviewLoading(true); setError(null);
    try {
      const packageRef = themeSel
        ? { kind: 'BANK_THEME', topic: themeSel.topic, count: themeSel.count, difficulty: themeSel.difficulty, ...(themeSel.seed ? { seed: themeSel.seed } : {}) }
        : { kind: 'SOAL_SET', soalSetId: packageId };
      const response = await fetch('/api/main-bersama/teacher/question-preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageRef }),
      });
      const body = await response.json() as { title?: string; questions?: PreviewQuestion[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Pratinjau gagal dimuat.');
      setPreviewData({ title: body.title ?? 'Paket soal', questions: body.questions ?? [] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Pratinjau gagal dimuat.');
    } finally { setPreviewLoading(false); }
  }

  async function openRoom() {
    if (!selectedKey || !mode) return;
    setOpening(true);
    setError(null);
    try {
      // Bentuk ref BERTIPE (union) — bukan objek longgar, supaya kesalahan
      // bentuk tertangkap di compile time, bukan di server.
      type CreateRef = NonNullable<Parameters<typeof postTeacherCommand>[0]['packageRef']>;
      const packageRef: CreateRef = themeSel
        ? {
            kind: 'BANK_THEME',
            topic: themeSel.topic,
            count: themeSel.count,
            difficulty: themeSel.difficulty,
            ...(themeSel.seed ? { seed: themeSel.seed } : {}),
          }
        : { kind: 'SOAL_SET', soalSetId: packageId ?? '' };
      // Subset eksplisit hanya bila caller sadar ada soal tak didukung (§5 Tahap 5).
      const result = await postTeacherCommand({
        action: 'create-session',
        gameMode: mode,
        packageRef,
        ...(classId ? { classId } : {}),
        config: { roundDurationMs: 60 * 1000,
          ...(mode === 'jelajah-kata' ? { teamCount, maxMembersPerTeam } : {}),
        },
        ...(partial ? { useSupportedQuestions: true } : {}),
      });
      const created = result.session as { id?: unknown } | undefined;
      const sessionId = created && typeof created.id === 'string' ? created.id : '';
      if (sessionId) localStorage.setItem(`mb-session-duration-${sessionId}`, String(durationMin));
      if (!sessionId) throw new MbApiError('INTERNAL', 'Sesi gagal dibuat.', 500);

      // UX lobby satu langkah: setelah sesi durable dibuat, langsung buka
      // lobby sebelum guru tiba di halaman ruang. Tidak ada lagi klik
      // "Buka Ruang" kedua. TeacherRoomClient tetap punya auto-recovery
      // bila command ini gagal karena gangguan jaringan sesaat.
      try {
        await postTeacherCommand({ action: 'open-lobby', sessionId });
      } catch {
        // Session sudah berhasil dibuat; lanjut ke ruang. Halaman ruang akan
        // mengubah PREPARING → LOBBY secara otomatis sebagai recovery.
      }

      router.push(`/guru/game/main-bersama/ruang/${sessionId}`);
    } catch (e) {
      setError(e instanceof MbApiError ? e.message : 'Gagal membuka ruang. Coba lagi.');
      setOpening(false);
    }
  }

  // Presentation-only recap of the existing selections.
  const selectedPackage = packages.find((p) => p.id === packageId);
  const selectedClass = classes.find((c) => c.id === classId);
  const selectedTitle = themeSel?.topic ?? selectedPackage?.title;
  const questionCount = selectedCompat?.supported ?? themeSel?.count ?? selectedPackage?.questionCount;
  const modeName = mode === 'jelajah-kata' ? 'Jelajah Kata' : mode === 'kota-cahaya' ? 'Kota Cahaya' : null;

  const bankSoalButton = (
    <button type="button" className={styles.bankButton}
      onClick={() => router.push('/guru/bank-soal?untuk=main-bersama')}>
      <BookOpen size={15} aria-hidden />
      {themeSel ? 'Ganti dari Bank Soal' : 'Pilih dari Bank Soal'}
      <ArrowRight size={14} aria-hidden />
    </button>
  );

  return (
    <main className={`${styles.setup} mb-fade-in`}>
      {previewData ? <QuestionPreview title={previewData.title} questions={previewData.questions} onClose={() => setPreviewData(null)} /> : null}

      <nav className={styles.breadcrumb} aria-label="Jejak navigasi">
        <a href="/guru/game">Ruang Gim & Tanding</a>
        <ChevronRight size={12} aria-hidden />
        <span aria-current="page">Main Bersama</span>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><Gamepad2 size={14} aria-hidden /> Kuis kelas langsung</span>
          <h1>Main <strong>Bersama</strong></h1>
          <p>Satu kelas, banyak cerita seru. Pilih soal dan cara bermain, lalu ajak kelasmu berpetualang.</p>
          <div className={styles.heroFeatures}>
            <span><Users size={14} aria-hidden /> Bermain sekelas</span>
            <span><Monitor size={14} aria-hidden /> Tampilkan di proyektor</span>
          </div>
          <div className={styles.durationPicker}>
            <label>Durasi permainan</label>
            <div className={styles.durationOptions}>
              {[5, 10, 15, 20, 30].map((m) => (
                <button key={m} type="button" className={durationMin === m ? styles.durationActive : ""} onClick={() => setDurationMin(m)}>{m} menit</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className={styles.steps} aria-label="Langkah persiapan permainan">
        <div className={`${styles.stepItem} ${selectedKey ? styles.stepDone : ''}`}>
          <span>{selectedKey ? <Check size={13} aria-hidden /> : '01'}</span> Pilih soal
        </div>
        <span className={styles.stepLine} aria-hidden />
        <div className={`${styles.stepItem} ${mode ? styles.stepDone : ''}`}>
          <span>{mode ? <Check size={13} aria-hidden /> : '02'}</span> Cara bermain
        </div>
        {classes.length > 0 ? <>
          <span className={styles.stepLine} aria-hidden />
          <div className={`${styles.stepItem} ${classId ? styles.stepDone : ''}`}>
            <span>{classId ? <Check size={13} aria-hidden /> : '03'}</span> Pilih kelas
          </div>
        </> : null}
      </div>

      <div className={styles.workspace}>
        <div className={styles.sections}>
          <section aria-labelledby="mb-pkg-h" className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.stepBadge} aria-hidden>01</span>
              <div><h2 id="mb-pkg-h">Pilih paket soal</h2><p>Gunakan Bank Soal atau siapkan soal milikmu.</p></div>
            </div>

            {themeSel ? (
              <div className={`${styles.packageItem} ${styles.packageSelected} ${styles.themePick}`}>
                <span className={styles.packageIcon}><BookOpen size={18} aria-hidden /></span>
                <span className={styles.packageBody}>
                  <span className={styles.packageTitle}>{themeSel.topic}</span>
                  <span className={styles.packageMeta}>
                    Tema Bank Soal · <strong>{themeSel.count}</strong> soal ·{' '}
                    {themeSel.difficulty ? DIFFICULTY_LABEL[themeSel.difficulty] ?? themeSel.difficulty : 'Semua tingkat'}
                    {selectedCompat && selectedCompat.supported === 0 ? (
                      <> · <span className={styles.packageIncompat}>belum ada soal yang cocok dimainkan</span></>
                    ) : selectedCompat && selectedCompat.supported < themeSel.count ? (
                      <> · <span className={styles.packageCompat}>{selectedCompat.supported} dari {themeSel.count} soal dapat dimainkan</span></>
                    ) : null}
                  </span>
                </span>
                <span className={styles.check}><Check size={13} aria-hidden /></span>
                {bankSoalButton}
              </div>
            ) : null}

            {!themeSel ? bankSoalButton : null}
            <QuestionPackageLibrary
              key={libraryRevision}
              initialPackages={packages.filter(item => item.isOwner !== false)}
              selectedId={!themeSel ? packageId : null}
              onSelect={selectPackage}
              onLoaded={mergePackages}
            />

            {selectedKey ? (
              <button type="button" onClick={() => void previewSelected()} disabled={previewLoading}
                className={styles.previewButton} aria-busy={previewLoading || undefined}>
                <Eye size={15} aria-hidden />
                {previewLoading ? 'Memuat pratinjau…' : 'Pratinjau paket terpilih sebelum bermain'}
              </button>
            ) : null}
            <QuestionPackageEditor onSaved={(p) => {
              setPackages(current => [p, ...current.filter(item => item.id !== p.id)]);
              setLibraryRevision(value => value + 1);
              setCompat(prev => ({ ...prev, [p.id]: { total: p.questionCount, supported: p.questionCount } }));
              setThemeSel(null); setPackageId(p.id); setError(null);
            }} />
          </section>

          <section className={styles.section} aria-labelledby="mb-mode-h">
            <div className={styles.sectionHead}>
              <span className={styles.stepBadge} aria-hidden>02</span>
              <div><h2 id="mb-mode-h">Pilih cara bermain</h2><p>Serunya berkompetisi atau hebatnya berkolaborasi?</p></div>
            </div>
            <div className={styles.modeList} role="group" aria-labelledby="mb-mode-h">
              <ModeCard mode="jelajah-kata" selected={mode === 'jelajah-kata'} onSelect={() => setMode('jelajah-kata')} />
              <ModeCard mode="kota-cahaya" selected={mode === 'kota-cahaya'} onSelect={() => setMode('kota-cahaya')} />
            </div>

            {mode === 'jelajah-kata' ? (
              <div className={styles.teamPanel} role="group" aria-label="Pengaturan regu Jelajah Kata">
                <div className={styles.teamHead}>
                  <h3><Users size={16} aria-hidden /> Atur regu petualangmu</h3>
                  <span className={styles.autoBadge}>Pembagian otomatis</span>
                </div>
                <div className={styles.teamGrid}>
                  <div>
                    <p className={styles.fieldLabel} id="mb-team-count-h">Jumlah regu</p>
                    <div className={styles.teamOptions} role="group" aria-labelledby="mb-team-count-h">
                      {[2, 3, 4, 5, 6].map((count) => (
                        <button key={count} type="button" aria-pressed={teamCount === count}
                          onClick={() => setTeamCount(count)} className={styles.teamOption}>
                          <strong>{count}</strong><span>regu</span>
                        </button>
                      ))}
                    </div>
                    <div className={styles.mascots} aria-label="Maskot regu terpilih">
                      {JELAJAH_TEAM_KEYS.slice(0, teamCount).map((id) => (
                        <div key={id} className={styles.mascot}>
                          <TeamMascot teamId={id} size={38} />
                          <span>{JELAJAH_DEFAULT_TEAMS[id].name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className={styles.teamInputs}>
                      <label className={styles.inputLabel}><span>Maksimal siswa per regu</span>
                        <input type="number" inputMode="numeric" min={1} max={50} value={maxMembersPerTeam}
                          onChange={(e) => setMaxMembersPerTeam(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
                      </label>
                      <label className={styles.inputLabel}><span>Perkiraan siswa <small>(opsional)</small></span>
                        <input type="number" inputMode="numeric" min={0} max={300} value={estimatedStudents || ''}
                          placeholder="Mis. 36" onChange={(e) => setEstimatedStudents(Math.max(0, Math.min(300, Number(e.target.value) || 0)))} />
                      </label>
                    </div>
                    <div className={`${styles.capacity} ${capacityShort ? styles.capacityShort : ''}`}>
                      <Users size={20} aria-hidden />
                      <div><strong>{teamCount * maxMembersPerTeam} siswa</strong><span>Kapasitas ruang permainan</span></div>
                    </div>
                  </div>
                </div>
                {estimatedStudents > 0 ? (
                  <p role="status" className={styles.capacityStatus} data-error={capacityShort}>
                    {capacityShort ? `Kapasitas belum cukup untuk ${estimatedStudents} siswa.` : `Perkiraan ${estimatedStudents} siswa: sekitar ${Math.floor(estimatedStudents/teamCount)}–${Math.ceil(estimatedStudents/teamCount)} siswa per regu.`}
                    {suggestedTeams <= 6 && suggestedTeams >= 2 && suggestedTeams !== teamCount
                      ? <button type="button" className={styles.suggestion} onClick={() => setTeamCount(suggestedTeams)}>Gunakan saran {suggestedTeams} regu <ArrowRight size={12} aria-hidden /></button> : null}
                  </p>
                ) : null}
                <p className={styles.modeNote}><Info size={14} aria-hidden /><span>Siswa dibagi otomatis ke regu dengan anggota paling sedikit. Soal berganti setelah seluruh anggota regu menjawab. Pastikan semua siswa masuk sebelum mulai.</span></p>
              </div>
            ) : null}
          </section>

          {classes.length > 0 ? (
            <section aria-labelledby="mb-cls-h" className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.stepBadge} aria-hidden>03</span>
                <div><h2 id="mb-cls-h">Pilih kelas</h2><p>Opsional — agar permainan tercatat untuk kelasmu.</p></div>
              </div>
              <div className={styles.classList}>
                <button type="button" aria-pressed={classId === null} onClick={() => setClassId(null)} className={styles.classChip}>
                  {classId === null ? <Check size={13} aria-hidden /> : null} Tanpa kelas
                </button>
                {classes.map((c) => (
                  <button key={c.id} type="button" aria-pressed={classId === c.id} onClick={() => setClassId(c.id)} className={styles.classChip}>
                    {classId === c.id ? <Check size={13} aria-hidden /> : <Users size={13} aria-hidden />} {c.name}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {error ? <p role="alert" className={styles.error}><Info size={15} aria-hidden />{error}</p> : null}
        </div>

        <aside className={styles.summary} aria-labelledby="mb-summary-h">
          <div className={styles.summaryArt} aria-hidden><span><Gamepad2 size={14} />Petualangan kelasmu</span></div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryHeading}>
              <div><h2 id="mb-summary-h">Siap bermain?</h2><p>Ini rencana permainan kelasmu.</p></div>
              <Sparkles size={20} aria-hidden />
            </div>
            <dl className={styles.summaryList}>
              <div className={styles.summaryRow}>
                <BookOpen size={16} aria-hidden />
                <div><dt>Paket soal</dt><dd data-empty={!selectedTitle}>{selectedTitle ?? 'Belum dipilih'}
                  {checking ? <small role="status">Memeriksa paket soal…</small> : questionCount !== undefined ? <small>{questionCount} soal dapat dimainkan</small> : null}
                </dd></div>
              </div>
              <div className={styles.summaryRow}>
                <Gamepad2 size={16} aria-hidden />
                <div><dt>Cara bermain</dt><dd data-empty={!modeName}>{modeName ?? 'Belum dipilih'}
                  {mode === 'jelajah-kata' ? <small>{teamCount} regu · Berlomba</small> : mode === 'kota-cahaya' ? <small>Satu kelas · Berkolaborasi</small> : null}
                </dd></div>
              </div>
              <div className={styles.summaryRow}>
                <Users size={16} aria-hidden />
                <div><dt>Kelas</dt><dd>{selectedClass?.name ?? 'Tanpa kelas'}<small>{selectedClass ? 'Hasil tercatat untuk kelas ini' : 'Pilihan kelas bersifat opsional'}</small></dd></div>
              </div>
            </dl>
            {mode === 'jelajah-kata' ? (
              <div className={styles.summaryStats}>
                <div><strong>{teamCount}</strong><span>Regu petualang</span></div>
                <div><strong>{teamCount * maxMembersPerTeam}</strong><span>Kapasitas siswa</span></div>
              </div>
            ) : null}
            <PrimaryGameButton onClick={openRoom} disabled={!canOpen} loading={opening || checking}
              variant="light" className={styles.openButton}>
              {partial && selectedCompat && !zero ? `Gunakan ${selectedCompat.supported} soal` : 'Buka Ruang'}
              <ArrowRight size={16} aria-hidden />
            </PrimaryGameButton>
            {!canOpen && !opening && !checking && disabledReason ? (
              <p role="status" className={styles.ctaReason}>{disabledReason}</p>
            ) : <p className={styles.ctaReason}>Buka ruang, lalu bagikan PIN ke siswa.</p>}
            <p className={styles.summaryTip}><Monitor size={14} aria-hidden /><span>Siapkan layar atau proyektor supaya seluruh kelas bisa mengikuti petualangan.</span></p>
          </div>
        </aside>
      </div>
    </main>
  );
}
