"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardPaste,
  FileText,
  Keyboard,
  LockKeyhole,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  blankQuestion,
  parseQuestionText,
  packageDraftSchema,
  type DraftQuestion,
} from "@/lib/main-bersama/question-authoring";
import type { SetupPackage } from "./setup-client";
import "./question-authoring.css";

type Stage = "source" | "edit" | "review";
type Source = "manual" | "document" | "text";
const stages: Array<{ id: Stage; label: string }> = [
  { id: "source", label: "Pilih cara" },
  { id: "edit", label: "Edit soal" },
  { id: "review", label: "Periksa & simpan" },
];
const questionTypes = [
  {
    type: "PILIHAN_GANDA",
    label: "Pilihan ganda",
    icon: "▦",
    hint: "Pilih satu jawaban",
  },
  {
    type: "BENAR_SALAH",
    label: "Benar / salah",
    icon: "✓ ✕",
    hint: "Nilai sebuah pernyataan",
  },
  {
    type: "ISIAN_SINGKAT",
    label: "Isian singkat",
    icon: "Aa",
    hint: "Ketik kata atau frasa",
  },
] as const;
function questionReady(q: DraftQuestion) {
  if (q.type === "ISIAN_SINGKAT")
    return Boolean(q.prompt.trim() && q.answerText?.trim());
  return Boolean(
    q.prompt.trim() &&
    q.options.every((o) => o.trim()) &&
    new Set(q.options.map((o) => o.trim().toLowerCase())).size ===
      q.options.length &&
    q.correctIndex !== null &&
    q.correctIndex >= 0 &&
    q.correctIndex < q.options.length,
  );
}
export default function QuestionPackageEditor({
  onSaved,
}: {
  onSaved: (value: SetupPackage) => void;
}) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("source");
  const [source, setSource] = useState<Source>("manual");
  const [title, setTitle] = useState("");
  const [kelas, setKelas] = useState("Umum");
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    blankQuestion(),
  ]);
  const [active, setActive] = useState(0);
  const [text, setText] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) heading.current?.focus();
  }, [stage, open]);
  const completed = questions.filter(questionReady).length;
  const q = questions[active] ?? questions[0];
  function update(patch: Partial<DraftQuestion>) {
    setQuestions((prev) =>
      prev.map((item, i) => (i === active ? { ...item, ...patch } : item)),
    );
    setReviewed(false);
    setError("");
    setDeletePending(false);
  }
  function selectQuestion(index: number) {
    setActive(index);
    setDeletePending(false);
    setError("");
  }
  function loadDraft(value: {
    questions: DraftQuestion[];
    warnings: string[];
  }) {
    setQuestions(value.questions.length ? value.questions : [blankQuestion()]);
    setWarnings(value.warnings);
    setActive(0);
    setReviewed(false);
    setError("");
    setStage("edit");
    setDeletePending(false);
  }
  function parse() {
    try {
      loadDraft(parseQuestionText(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Periksa teks soal.");
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("Dokumen terlalu besar. Pilih file maksimal 3 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(
        "/api/main-bersama/teacher/import-document",
        { method: "POST", body: form },
      );
      const result = (await response.json()) as {
        error?: string;
        text: string;
        questions: DraftQuestion[];
        warnings: string[];
      };
      if (!response.ok)
        throw new Error(result.error ?? "Dokumen belum terbaca.");
      setText(result.text);
      setFileName(file.name);
      if (!title)
        setTitle(file.name.replace(/\.(pdf|docx)$/i, "").slice(0, 120));
      loadDraft(result);
    } catch (e) {
      setError(
        e instanceof TypeError || e instanceof SyntaxError
          ? "Impor belum berhasil. Periksa koneksi, lalu coba lagi."
          : e instanceof Error
            ? e.message
            : "Impor gagal. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  function checkDraft() {
    if (!title.trim()) {
      setStage("edit");
      setError("Beri judul paket agar mudah ditemukan kembali.");
      return false;
    }
    if (!kelas.trim()) {
      setStage("edit");
      setError("Isi kelas, atau gunakan “Umum”.");
      return false;
    }
    const invalid = questions.findIndex((item) => !questionReady(item));
    if (invalid !== -1) {
      setActive(invalid);
      setStage("edit");
      setError(
        `Soal ${invalid + 1} belum siap. Lengkapi pertanyaan, pilihan yang berbeda, dan pilih satu kunci jawaban.`,
      );
      return false;
    }
    const valid = packageDraftSchema.safeParse({
      title,
      kelas,
      questions,
      reviewed: true,
    });
    if (!valid.success) {
      setStage("edit");
      setError(
        "Ada isi soal yang terlalu panjang. Periksa pertanyaan dan pilihan jawabannya.",
      );
      return false;
    }
    setError("");
    return true;
  }
  async function save() {
    if (!checkDraft()) return;
    if (!reviewed) {
      setError("Centang konfirmasi pemeriksaan sebelum menyimpan.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/main-bersama/teacher/question-packages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, kelas, questions, reviewed }),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        package: SetupPackage;
      };
      if (!response.ok)
        throw new Error(result.error ?? "Soal belum tersimpan. Coba lagi.");
      onSaved(result.package);
      setOpen(false);
      setStage("source");
      setSource("manual");
      setTitle("");
      setKelas("Umum");
      setText("");
      setQuestions([blankQuestion()]);
      setActive(0);
      setReviewed(false);
      setWarnings([]);
      setFileName("");
    } catch (e) {
      setError(
        e instanceof TypeError || e instanceof SyntaxError
          ? "Soal belum tersimpan. Periksa koneksi dan coba lagi; draft masih ada di sini."
          : e instanceof Error
            ? e.message
            : "Soal belum tersimpan. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  function addQuestion() {
    setQuestions((prev) => [...prev, blankQuestion()]);
    setActive(questions.length);
    setReviewed(false);
    setDeletePending(false);
    setError("");
  }
  return (
    <div className="mb-author">
      {!open ? (
        <button
          className="mb-author-launch"
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
        >
          <span className="mb-author-launch-icon">
            <Plus size={22} />
          </span>
          <span>
            <strong>Buat soal sendiri</strong>
            <small>Tulis langsung atau impor PDF / DOCX</small>
          </span>
          <ArrowRight size={20} />
        </button>
      ) : (
        <section
          className="mb-author-panel"
          aria-label="Buat paket soal sendiri"
          aria-busy={busy}
        >
          <header className="mb-author-header">
            <div>
              <span className="mb-author-eyebrow">STUDIO SOAL</span>
              <h3 ref={heading} tabIndex={-1}>
                {stage === "source"
                  ? "Mulai dari soal milikmu"
                  : stage === "edit"
                    ? "Buat soal yang seru untuk kelasmu"
                    : "Siap dimainkan bersama"}
              </h3>
              <p>
                {stage === "source"
                  ? "Pilih cara yang paling nyaman. Semua bisa diedit sebelum dimainkan."
                  : stage === "edit"
                    ? "Fokus satu soal dulu. Tandai jawaban yang benar, lalu lanjut."
                    : "Periksa paket sekali lagi, lalu gunakan untuk membuka ruang."}
              </p>
            </div>
            <button
              type="button"
              className="mb-author-close"
              aria-label="Tutup editor, pertahankan draft"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </header>
          <ol className="mb-author-steps" aria-label="Tahapan membuat soal">
            {stages.map((item, i) => (
              <li
                key={item.id}
                aria-current={stage === item.id ? "step" : undefined}
              >
                <span>{i + 1}</span>
                {item.label}
              </li>
            ))}
          </ol>
          {error && (
            <div className="mb-author-error" role="alert">
              {error}
            </div>
          )}
          <fieldset className="mb-author-body" disabled={busy}>
            {stage === "source" && (
              <>
                <div className="mb-author-sources">
                  {(
                    [
                      {
                        id: "manual",
                        icon: Keyboard,
                        title: "Tulis langsung",
                        description:
                          "Buat pertanyaan dan pilihan jawaban satu per satu.",
                      },
                      {
                        id: "document",
                        icon: FileText,
                        title: "Unggah dokumen",
                        description:
                          "Ambil soal dari file PDF atau Word yang sudah kamu punya.",
                      },
                      {
                        id: "text",
                        icon: ClipboardPaste,
                        title: "Tempel teks",
                        description:
                          "Salin soal beserta pilihan dan kunci jawabannya.",
                      },
                    ] as const
                  ).map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`mb-author-source ${source === item.id ? "is-selected" : ""}`}
                      aria-pressed={source === item.id}
                      onClick={() => {
                        setSource(item.id);
                        setError("");
                      }}
                    >
                      <item.icon size={26} />
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                      {source === item.id && (
                        <Check size={16} className="mb-author-source-check" />
                      )}
                    </button>
                  ))}
                </div>
                {source === "manual" && (
                  <div className="mb-author-source-info">
                    <p>
                      <strong>Mulai dengan satu pertanyaan.</strong>
                      <br />
                      Tambahkan soal kapan saja. Paket tersimpan privat untukmu.
                    </p>
                    <button
                      type="button"
                      className="mb-author-primary"
                      onClick={() => {
                        setStage("edit");
                        setError("");
                      }}
                    >
                      Mulai menulis <ArrowRight size={18} />
                    </button>
                  </div>
                )}
                {source === "document" && (
                  <div className="mb-author-upload-zone">
                    <UploadCloud size={34} />
                    <h4>Soalmu sudah ada di dokumen?</h4>
                    <p>PDF atau DOCX berisi teks · maksimal 3 MB</p>
                    <button
                      type="button"
                      className="mb-author-primary"
                      onClick={() => fileInput.current?.click()}
                    >
                      {busy ? "Membaca dokumen…" : "Pilih dokumen"}
                    </button>
                    <input
                      ref={fileInput}
                      type="file"
                      accept=".pdf,.docx"
                      aria-label="Unggah PDF atau DOCX"
                      className="mb-author-file"
                      onChange={(e) => {
                        void upload(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <small>
                      PDF hasil scan dan gambar belum didukung. Soal hasil impor
                      tetap bisa kamu perbaiki.
                    </small>
                  </div>
                )}
                {source === "text" && (
                  <div className="mb-author-paste">
                    <label>
                      Teks soal
                      <textarea
                        aria-label="Teks sumber soal"
                        rows={7}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={
                          "1. Kata baku yang tepat?\nA. Aktivitas\nB. Aktifitas\nJawaban: A"
                        }
                      />
                    </label>
                    <p>
                      Gunakan nomor soal dan “Jawaban: A”. Untuk tipe lain,
                      tambahkan “Jenis: Benar Salah” atau “Jenis: Isian
                      Singkat”, lalu tulis kuncinya pada “Jawaban:”.
                    </p>
                    <button
                      type="button"
                      className="mb-author-primary"
                      disabled={!text.trim()}
                      onClick={parse}
                    >
                      Baca & edit soal <ArrowRight size={18} />
                    </button>
                  </div>
                )}
                {questions.some(
                  (item) =>
                    item.prompt.trim() || item.options.some((o) => o.trim()),
                ) && (
                  <p className="mb-author-draft-note">
                    Draft sebelumnya masih ada. Impor atau baca teks baru akan
                    mengganti isinya.{" "}
                    <button type="button" onClick={() => setStage("edit")}>
                      Lanjutkan draft
                    </button>
                  </p>
                )}
              </>
            )}
            {stage === "edit" && (
              <>
                <div className="mb-author-fields">
                  <label>
                    Judul paket
                    <input
                      maxLength={120}
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setReviewed(false);
                        setError("");
                      }}
                      placeholder="Contoh: Jelajah Kosakata"
                    />
                  </label>
                  <label>
                    Kelas
                    <input
                      maxLength={30}
                      value={kelas}
                      onChange={(e) => {
                        setKelas(e.target.value);
                        setReviewed(false);
                        setError("");
                      }}
                      placeholder="VII / Umum"
                    />
                  </label>
                </div>
                {warnings.length > 0 && (
                  <div className="mb-author-warning" role="status">
                    Hasil impor perlu diperiksa. Lengkapi soal dan kunci yang
                    belum terisi; teks asli tersedia di bawah.
                  </div>
                )}
                <div className="mb-author-workspace">
                  <aside className="mb-author-sidebar">
                    <div className="mb-author-list-heading">
                      <strong>Daftar soal</strong>
                      <span aria-live="polite">
                        {completed}/{questions.length} siap
                      </span>
                    </div>
                    <nav
                      className="mb-author-question-list"
                      aria-label="Pilih soal untuk diedit"
                    >
                      {questions.map((item, i) => (
                        <button
                          type="button"
                          key={i}
                          className={i === active ? "is-active" : ""}
                          aria-current={i === active ? "true" : undefined}
                          aria-label={`Edit soal ${i + 1}${questionReady(item) ? ", sudah terisi" : ", belum lengkap"}`}
                          onClick={() => selectQuestion(i)}
                        >
                          <span>{i + 1}</span>
                          <span>{item.prompt.trim() || "Pertanyaan baru"}</span>
                          {questionReady(item) && <Check size={16} />}
                        </button>
                      ))}
                    </nav>
                    <button
                      type="button"
                      className="mb-author-secondary"
                      disabled={questions.length >= 50}
                      onClick={addQuestion}
                    >
                      <Plus size={16} /> Tambah soal
                    </button>
                    <small>Maksimal 50 soal per paket</small>
                  </aside>
                  <article className="mb-author-question">
                    <div className="mb-author-question-head">
                      <strong>
                        Soal {active + 1} <span>dari {questions.length}</span>
                      </strong>
                      <button
                        type="button"
                        aria-label={`Hapus soal ${active + 1}`}
                        disabled={questions.length === 1}
                        className="mb-author-delete"
                        onClick={() => setDeletePending(true)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {deletePending && (
                      <div className="mb-author-delete-confirm">
                        <span>Hapus soal ini dari draft?</span>
                        <button
                          type="button"
                          onClick={() => {
                            setQuestions(
                              questions.filter((_, i) => i !== active),
                            );
                            setActive(Math.max(0, active - 1));
                            setReviewed(false);
                            setDeletePending(false);
                          }}
                        >
                          Ya, hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletePending(false)}
                        >
                          Batal
                        </button>
                      </div>
                    )}
                    <fieldset className="mb-author-type-picker">
                      <legend>
                        Jenis soal <small>Pilih cara siswa menjawab</small>
                      </legend>
                      <div>
                        {questionTypes.map((item) => (
                          <button
                            type="button"
                            key={item.type}
                            aria-pressed={
                              (q.type ?? "PILIHAN_GANDA") === item.type
                            }
                            onClick={() => {
                              if ((q.type ?? "PILIHAN_GANDA") !== item.type)
                                update({
                                  type: item.type,
                                  options:
                                    item.type === "ISIAN_SINGKAT"
                                      ? []
                                      : item.type === "BENAR_SALAH"
                                        ? ["Benar", "Salah"]
                                        : ["", "", "", ""],
                                  correctIndex: null,
                                  answerText: "",
                                });
                            }}
                          >
                            <span aria-hidden="true">{item.icon}</span>
                            <strong>{item.label}</strong>
                            <small>{item.hint}</small>
                          </button>
                        ))}
                      </div>
                      <p>
                        Mengganti jenis soal akan mengosongkan pilihan dan
                        kuncinya.
                      </p>
                    </fieldset>
                    <label>
                      {q.type === "BENAR_SALAH" ? "Pernyataan" : "Pertanyaan"}
                      <textarea
                        aria-label="Pertanyaan dan bacaan"
                        rows={4}
                        maxLength={6000}
                        value={q.prompt}
                        onChange={(e) => update({ prompt: e.target.value })}
                        placeholder="Tuliskan pertanyaanmu di sini. Tambahkan bacaan jika diperlukan."
                      />
                    </label>
                    {q.type === "ISIAN_SINGKAT" ? (
                      <div className="mb-author-short-key">
                        <label>
                          Kunci jawaban
                          <input
                            aria-label="Kunci isian singkat"
                            maxLength={200}
                            value={q.answerText ?? ""}
                            onChange={(e) =>
                              update({ answerText: e.target.value })
                            }
                            placeholder="Contoh: metafora"
                          />
                        </label>
                        <p>
                          Siswa mengetik jawaban sendiri. Huruf besar/kecil dan
                          spasi berlebih diabaikan; ejaan harus sesuai kunci.
                        </p>
                      </div>
                    ) : (
                      <fieldset className="mb-author-answers">
                        <legend>
                          Pilihan jawaban{" "}
                          <small>
                            Pilih lingkaran pada jawaban yang benar.
                          </small>
                        </legend>
                        <div className="mb-author-answer-grid">
                          {q.options.map((option, i) => (
                            <div
                              key={i}
                              className={`mb-author-option ${q.correctIndex === i ? "is-correct" : ""}`}
                            >
                              <label className="mb-author-answer-pick">
                                <input
                                  type="radio"
                                  name="active-answer"
                                  checked={q.correctIndex === i}
                                  aria-label={`Soal ${active + 1}, kunci ${String.fromCharCode(65 + i)}`}
                                  onChange={() => update({ correctIndex: i })}
                                />
                                <span>{String.fromCharCode(65 + i)}</span>
                                <small>
                                  {q.correctIndex === i
                                    ? "Jawaban benar"
                                    : "Jadikan kunci"}
                                </small>
                              </label>
                              <input
                                aria-label={`Soal ${active + 1}, pilihan ${String.fromCharCode(65 + i)}`}
                                readOnly={q.type === "BENAR_SALAH"}
                                maxLength={2000}
                                value={option}
                                onChange={(e) =>
                                  update({
                                    options: q.options.map((o, j) =>
                                      j === i ? e.target.value : o,
                                    ),
                                  })
                                }
                                placeholder={`Pilihan ${String.fromCharCode(65 + i)}`}
                              />
                            </div>
                          ))}
                        </div>
                        {q.type !== "BENAR_SALAH" && (
                          <div className="mb-author-option-actions">
                            <button
                              type="button"
                              disabled={q.options.length >= 5}
                              onClick={() =>
                                update({ options: [...q.options, ""] })
                              }
                            >
                              + Pilihan jawaban
                            </button>
                            <button
                              type="button"
                              disabled={q.options.length <= 2}
                              onClick={() =>
                                update({
                                  options: q.options.slice(0, -1),
                                  correctIndex:
                                    q.correctIndex === q.options.length - 1
                                      ? null
                                      : q.correctIndex,
                                })
                              }
                            >
                              − Pilihan terakhir
                            </button>
                          </div>
                        )}
                      </fieldset>
                    )}
                    <details className="mb-author-explanation">
                      <summary>
                        Pembahasan <span>Opsional</span>
                      </summary>
                      <textarea
                        aria-label="Pembahasan"
                        rows={3}
                        maxLength={6000}
                        value={q.explanation}
                        onChange={(e) =>
                          update({ explanation: e.target.value })
                        }
                        placeholder="Jelaskan mengapa jawaban ini benar."
                      />
                    </details>
                    <div className="mb-author-question-navigation">
                      <button
                        type="button"
                        className="mb-author-secondary"
                        disabled={active === 0}
                        onClick={() => selectQuestion(active - 1)}
                      >
                        <ArrowLeft size={16} /> Sebelumnya
                      </button>
                      {active < questions.length - 1 ? (
                        <button
                          type="button"
                          className="mb-author-secondary"
                          onClick={() => selectQuestion(active + 1)}
                        >
                          Soal berikutnya <ArrowRight size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="mb-author-secondary"
                          disabled={questions.length >= 50}
                          onClick={addQuestion}
                        >
                          <Plus size={16} /> Tambah soal
                        </button>
                      )}
                    </div>
                  </article>
                </div>
                {text && (
                  <details className="mb-author-original">
                    <summary>
                      Lihat teks asli {fileName ? `· ${fileName}` : ""}
                    </summary>
                    <textarea
                      aria-label="Teks asli dokumen"
                      value={text}
                      readOnly
                      rows={7}
                    />
                    <p>
                      Bandingkan bacaan dan pilihan agar tidak ada isi yang
                      terlewat.
                    </p>
                  </details>
                )}
                <footer className="mb-author-footer">
                  <button
                    type="button"
                    className="mb-author-text-button"
                    onClick={() => {
                      setStage("source");
                      setError("");
                    }}
                  >
                    <ArrowLeft size={16} /> Pilih cara lain
                  </button>
                  <button
                    type="button"
                    className="mb-author-primary"
                    onClick={() => {
                      if (checkDraft()) setStage("review");
                    }}
                  >
                    Periksa paket <ArrowRight size={18} />
                  </button>
                </footer>
              </>
            )}
            {stage === "review" && (
              <>
                <div className="mb-author-package-summary">
                  <span className="mb-author-summary-icon">
                    <FileText size={28} />
                  </span>
                  <div>
                    <h4>{title}</h4>
                    <p>
                      {kelas === "Umum" ? "Semua kelas" : `Kelas ${kelas}`} ·{" "}
                      {questions.length} soal
                    </p>
                  </div>
                  <span className="mb-author-private">
                    <LockKeyhole size={14} /> Privat
                  </span>
                </div>
                <p className="mb-author-review-intro">
                  Klik soal untuk mengedit. Setelah disimpan, paket langsung
                  terpilih untuk Main Bersama.
                </p>
                <div className="mb-author-review-list">
                  {questions.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setActive(i);
                        setStage("edit");
                        setError("");
                      }}
                    >
                      <span className="mb-author-review-number">{i + 1}</span>
                      <span>
                        <strong>{item.prompt}</strong>
                        <small>
                          <Check size={14} />{" "}
                          {
                            questionTypes.find(
                              (t) => t.type === (item.type ?? "PILIHAN_GANDA"),
                            )?.label
                          }{" "}
                          · Kunci:{" "}
                          {item.type === "ISIAN_SINGKAT"
                            ? item.answerText
                            : item.options[item.correctIndex ?? 0]}
                        </small>
                      </span>
                      <span className="mb-author-review-edit">Edit</span>
                    </button>
                  ))}
                </div>
                <label className="mb-author-review">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(e) => {
                      setReviewed(e.target.checked);
                      setError("");
                    }}
                  />
                  <span>
                    Saya sudah memeriksa pertanyaan, pilihan, dan kunci jawaban.
                    <small>Paket ini dapat dipakai kembali oleh akunmu.</small>
                  </span>
                </label>
                <footer className="mb-author-footer">
                  <button
                    type="button"
                    className="mb-author-text-button"
                    onClick={() => setStage("edit")}
                  >
                    <ArrowLeft size={16} /> Kembali mengedit
                  </button>
                  <button
                    type="button"
                    className="mb-author-primary"
                    disabled={!reviewed}
                    onClick={() => void save()}
                  >
                    <Check size={18} /> Simpan & gunakan
                  </button>
                </footer>
              </>
            )}
          </fieldset>
          {busy && (
            <p className="mb-author-busy" role="status">
              {stage === "source"
                ? "Membaca dokumenmu…"
                : "Menyimpan paket soal…"}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
