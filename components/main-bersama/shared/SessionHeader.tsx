import type { GameMode } from '@/src/main-bersama/domain/types/session';

interface SessionHeaderProps {
  mode: GameMode;
  /** Nama paket/tema (label saja — bukan objek domain). */
  packageName?: string;
  className?: string;
  /** Progres putaran "2 dari 8" bila sesi sudah mulai. */
  roundLabel?: string | null;
  /** Slot kontrol sekunder (Jeda/Akhiri). */
  actions?: React.ReactNode;
}

const MODE_LABEL: Record<GameMode, string> = {
  'jelajah-kata': 'Jelajah Kata',
  'kota-cahaya': 'Kota Cahaya',
};

/** Header sesi ringan — identitas + progres, tanpa kompleksitas (§18). */
export function SessionHeader({
  mode,
  packageName,
  className,
  roundLabel,
  actions,
}: SessionHeaderProps) {
  return (
    <header className="mb-session-header">
      <div className="mb-session-meta">
        <span className="mb-session-mode">
          <i className="mb-session-dot" aria-hidden />
          {MODE_LABEL[mode]}
        </span>
        {packageName ? <span className="mb-session-pkg">{packageName}</span> : null}
        {className ? <span className="mb-session-pkg">{className}</span> : null}
        {roundLabel ? (
          <span className="mb-session-round mb-number">{roundLabel}</span>
        ) : null}
      </div>
      {actions ? <div className="mb-session-actions">{actions}</div> : null}
      <style jsx>{`
        .mb-session-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--mb-space-3);
          padding: var(--mb-space-3) var(--mb-space-5);
        }
        .mb-session-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--mb-space-2);
          min-width: 0;
        }
        .mb-session-mode {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 14px;
          border-radius: var(--mb-radius-pill);
          background: var(--mb-primary-soft);
          color: var(--mb-primary);
          font-weight: 800;
          font-size: 0.85rem;
        }
        /* Kontras aman di surface guru (teal gelap di atas terang). */
        .mb-scope-guru .mb-session-mode { color: var(--mb-primary-strong); }
        .mb-session-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }
        .mb-session-pkg,
        .mb-session-round {
          color: var(--mb-text-secondary);
          font-size: 0.85rem;
          font-weight: 600;
        }
        .mb-scope-guru .mb-session-pkg,
        .mb-scope-guru .mb-session-round { color: var(--mb-text-guru-secondary); }
        .mb-session-actions {
          display: flex;
          gap: var(--mb-space-2);
        }
      `}</style>
    </header>
  );
}
