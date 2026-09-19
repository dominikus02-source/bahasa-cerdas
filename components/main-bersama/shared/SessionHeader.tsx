import type { GameMode } from '@/src/main-bersama/domain/types/session';

interface SessionHeaderProps {
  mode: GameMode;
  /** Nama paket/tema (label saja — bukan objek domain). */
  packageName?: string;
  className?: string;
  /** Progres putaran "2 dari 8" bila sesi sudah mulai. */
  roundLabel?: string | null;
  /** Slot kontrol sekunder (Pause/Akhiri). */
  actions?: React.ReactNode;
}

const MODE_LABEL: Record<GameMode, string> = {
  'jelajah-kata': 'Jelajah Kata',
  'kota-cahaya': 'Kota Cahaya',
};

/** Header sesi ringan — identitas + progres, tanpa kompleksitas (§2). */
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
        <span className="mb-session-mode">{MODE_LABEL[mode]}</span>
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
          padding: 4px 12px;
          border-radius: var(--mb-radius-pill);
          background: var(--mb-primary-soft);
          color: var(--mb-primary);
          font-weight: 700;
          font-size: 0.85rem;
        }
        .mb-session-pkg,
        .mb-session-round {
          color: var(--mb-text-secondary);
          font-size: 0.85rem;
          font-weight: 600;
        }
        .mb-session-actions {
          display: flex;
          gap: var(--mb-space-2);
        }
      `}</style>
    </header>
  );
}
