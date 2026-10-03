"use client";

export default function AnswerSavedNotice({ automaticTeams, answeredCount = 0, eligibleCount = 0 }: { automaticTeams?: boolean; answeredCount?: number; eligibleCount?: number }) {
  return (
    <div className="mb-answer-saved-notice mb-entrance" role="status" aria-live="polite">
      <span className="mb-answer-saved-icon" aria-hidden>✓</span>
      <div className="mb-answer-saved-copy">
        <strong>Jawaban terkunci!</strong>
        <p>{automaticTeams ? `Menunggu anggota regu · ${answeredCount}/${eligibleCount} sudah menjawab. Soal berikutnya berganti otomatis.` : 'Jawabanmu sudah tersimpan. Tunggu putaran selesai.'}</p>
      </div>
      <style jsx>{`
        .mb-answer-saved-notice { display: flex; align-items: flex-start; gap: 14px; width: 100%; min-width: 0; padding: 20px; border: 1px solid rgba(58, 220, 160, .4); border-radius: 22px; background: linear-gradient(135deg, #123e37, #0b2b2c); box-shadow: 0 12px 28px rgba(0,0,0,.12); }
        .mb-answer-saved-icon { display: grid; place-items: center; flex: 0 0 42px; width: 42px; height: 42px; border-radius: 14px; color: #06261d; background: #44d49b; font-size: 1.3rem; font-weight: 900; line-height: 1; }
        .mb-answer-saved-copy { flex: 1; min-width: 0; overflow-wrap: anywhere; text-align: left; }
        .mb-answer-saved-copy strong { display: block; color: #b2ffde; font-size: 1.1rem; line-height: 1.4; }
        .mb-answer-saved-copy p { margin: 6px 0 0; color: #bddad0; font-size: .88rem; line-height: 1.6; }
        @media (max-width: 360px) { .mb-answer-saved-notice { padding: 16px; gap: 10px; } }
      `}</style>
    </div>
  );
}
