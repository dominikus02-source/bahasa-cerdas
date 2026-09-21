// ─── Bank Soal Illustration System ──────────────────────────
// 15 reusable SVG illustration concepts for theme card covers.
// All illustrations render in white/transparent on solid color bg.
// Consistent: 1.5px stroke, editorial, abstract, educational.
// NO emoji. NO photo. NO external assets.

import type { LucideIcon } from "lucide-react";

export type IllustrationKey =
  | "writing"
  | "document"
  | "book"
  | "poetry"
  | "theater"
  | "speech"
  | "letter"
  | "process"
  | "newspaper"
  | "contrast"
  | "structure"
  | "language"
  | "story"
  | "quote-deco"
  | "literary";

interface IllProps {
  className?: string;
}

// Shared SVG props for consistency
const S = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

/** Pen on lined paper — writing, grammar, punctuation. */
function WritingIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      {/* Paper */}
      <rect x="28" y="12" width="64" height="56" rx="3" {...S} />
      {/* Lines */}
      <line x1="36" y1="26" x2="76" y2="26" {...S} strokeWidth={1} opacity={0.5} />
      <line x1="36" y1="34" x2="72" y2="34" {...S} strokeWidth={1} opacity={0.5} />
      <line x1="36" y1="42" x2="68" y2="42" {...S} strokeWidth={1} opacity={0.5} />
      <line x1="36" y1="50" x2="60" y2="50" {...S} strokeWidth={1} opacity={0.5} />
      {/* Pen */}
      <path d="M78 18 L92 4 L96 8 L82 22 Z" {...S} />
      <line x1="78" y1="18" x2="82" y2="22" {...S} />
      <circle cx="77" cy="23" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Text block / document — paragraphs, descriptions, arguments. */
function DocumentIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      <rect x="24" y="10" width="52" height="60" rx="3" {...S} />
      <rect x="44" y="18" width="52" height="60" rx="3" {...S} opacity={0.4} />
      {/* Lines on front doc */}
      <line x1="32" y1="24" x2="68" y2="24" {...S} strokeWidth={1} />
      <line x1="32" y1="32" x2="64" y2="32" {...S} strokeWidth={1} />
      <line x1="32" y1="40" x2="60" y2="40" {...S} strokeWidth={1} />
      <line x1="32" y1="48" x2="56" y2="48" {...S} strokeWidth={1} />
      <line x1="32" y1="56" x2="52" y2="56" {...S} strokeWidth={1} />
    </svg>
  );
}

/** Open book — literature, novels, fables, reviews. */
function BookIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      {/* Left page */}
      <path d="M60 18 Q42 14 24 18 L24 62 Q42 58 60 62 Z" {...S} />
      {/* Right page */}
      <path d="M60 18 Q78 14 96 18 L96 62 Q78 58 60 62 Z" {...S} />
      {/* Spine */}
      <line x1="60" y1="18" x2="60" y2="62" {...S} />
      {/* Text lines left */}
      <line x1="32" y1="28" x2="52" y2="28" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="32" y1="34" x2="50" y2="34" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="32" y1="40" x2="48" y2="40" {...S} strokeWidth={1} opacity={0.4} />
      {/* Text lines right */}
      <line x1="68" y1="28" x2="88" y2="28" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="68" y1="34" x2="86" y2="34" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="68" y1="40" x2="84" y2="40" {...S} strokeWidth={1} opacity={0.4} />
    </svg>
  );
}

/** Feather + verse lines — poetry, pantun, syair. */
function PoetryIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      {/* Feather */}
      <path d="M30 60 Q38 30 56 14 Q50 28 52 40 Q54 50 48 58 Z" {...S} />
      <path d="M56 14 Q48 20 42 30" {...S} strokeWidth={1} />
      {/* Verse lines (indented, poem-like) */}
      <line x1="64" y1="24" x2="96" y2="24" {...S} strokeWidth={1} />
      <line x1="68" y1="32" x2="92" y2="32" {...S} strokeWidth={1} />
      <line x1="64" y1="40" x2="96" y2="40" {...S} strokeWidth={1} />
      <line x1="68" y1="48" x2="88" y2="48" {...S} strokeWidth={1} />
      <line x1="64" y1="56" x2="94" y2="56" {...S} strokeWidth={1} />
    </svg>
  );
}

/** Stage curtain — drama, theater. */
function TheaterIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      {/* Stage */}
      <rect x="20" y="52" width="80" height="16" rx="2" {...S} />
      {/* Curtain left */}
      <path d="M20 14 L20 52 Q36 46 44 52" {...S} />
      {/* Curtain right */}
      <path d="M100 14 L100 52 Q84 46 76 52" {...S} />
      {/* Top bar */}
      <line x1="16" y1="14" x2="104" y2="14" {...S} strokeWidth={2} />
      {/* Curtain drape */}
      <path d="M44 14 Q52 30 60 14 Q68 30 76 14" {...S} strokeWidth={1} />
      {/* Spotlight */}
      <path d="M56 8 L52 14 L68 14 L64 8 Z" {...S} strokeWidth={1} opacity={0.4} />
    </svg>
  );
}

/** Podium + speech lines — pidato, public speaking. */
function SpeechIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      {/* Podium */}
      <path d="M40 36 L40 68 L80 68 L80 36 L72 28 L48 28 Z" {...S} />
      {/* Microphone */}
      <line x1="60" y1="14" x2="60" y2="28" {...S} />
      <rect x="55" y="10" width="10" height="12" rx="5" {...S} />
      <path d="M50 20 Q50 26 60 26 Q70 26 70 20" {...S} strokeWidth={1} />
      {/* Speech lines */}
      <line x1="86" y1="20" x2="100" y2="20" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="84" y1="26" x2="104" y2="26" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="86" y1="32" x2="98" y2="32" {...S} strokeWidth={1} opacity={0.4} />
    </svg>
  );
}

/** Envelope + letter — surat dinas, surat pribadi. */
function LetterIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      {/* Envelope */}
      <rect x="22" y="22" width="76" height="44" rx="3" {...S} />
      {/* Flap */}
      <path d="M22 22 L60 48 L98 22" {...S} />
      {/* Letter peeking out */}
      <rect x="32" y="14" width="56" height="32" rx="2" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="40" y1="22" x2="80" y2="22" {...S} strokeWidth={1} opacity={0.3} />
      <line x1="40" y1="28" x2="76" y2="28" {...S} strokeWidth={1} opacity={0.3} />
      <line x1="40" y1="34" x2="72" y2="34" {...S} strokeWidth={1} opacity={0.3} />
    </svg>
  );
}

/** Numbered steps / flowchart — teks prosedur, proposal. */
function ProcessIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      {/* Step 1 */}
      <circle cx="30" cy="20" r="10" {...S} />
      <line x1="26" y1="20" x2="34" y2="20" {...S} strokeWidth={1} />
      <line x1="30" y1="16" x2="30" y2="24" {...S} strokeWidth={1} />
      {/* Arrow */}
      <line x1="40" y1="20" x2="52" y2="20" {...S} strokeWidth={1} />
      <path d="M50 17 L54 20 L50 23" {...S} strokeWidth={1} />
      {/* Step 2 */}
      <circle cx="64" cy="20" r="10" {...S} />
      <line x1="60" y1="20" x2="68" y2="20" {...S} strokeWidth={1} />
      <line x1="64" y1="16" x2="64" y2="24" {...S} strokeWidth={1} />
      {/* Arrow down */}
      <line x1="64" y1="30" x2="64" y2="42" {...S} strokeWidth={1} />
      <path d="M61 40 L64 44 L67 40" {...S} strokeWidth={1} />
      {/* Step 3 */}
      <circle cx="64" cy="54" r="10" {...S} />
      <path d="M60 52 L64 58 L70 50" {...S} strokeWidth={1.5} />
      {/* Decorative line */}
      <line x1="26" y1="54" x2="44" y2="54" {...S} strokeWidth={1} opacity={0.3} />
    </svg>
  );
}

/** Newspaper layout — berita, editorial, artikel. */
function NewspaperIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      {/* Paper */}
      <rect x="20" y="10" width="80" height="60" rx="2" {...S} />
      {/* Headline */}
      <rect x="28" y="18" width="48" height="6" rx="1" {...S} strokeWidth={1} />
      {/* Image placeholder */}
      <rect x="28" y="28" width="24" height="20" rx="1" {...S} strokeWidth={1} opacity={0.4} />
      {/* Column lines */}
      <line x1="56" y1="28" x2="92" y2="28" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="56" y1="34" x2="92" y2="34" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="56" y1="40" x2="92" y2="40" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="56" y1="46" x2="88" y2="46" {...S} strokeWidth={1} opacity={0.4} />
      {/* Bottom line */}
      <line x1="28" y1="54" x2="92" y2="54" {...S} strokeWidth={1} opacity={0.3} />
      <line x1="28" y1="60" x2="92" y2="60" {...S} strokeWidth={1} opacity={0.3} />
    </svg>
  );
}

/** Two opposing shapes — sinonim, antonim. */
function ContrastIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      {/* Left shape (circle) */}
      <circle cx="42" cy="40" r="20" {...S} />
      {/* Right shape (square) */}
      <rect x="62" y="20" width="40" height="40" rx="4" {...S} />
      {/* Overlap highlight */}
      <path d="M62 28 Q52 40 62 52" {...S} strokeWidth={1} opacity={0.3} />
      {/* Connection arrows */}
      <line x1="48" y1="34" x2="56" y2="34" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="48" y1="46" x2="56" y2="46" {...S} strokeWidth={1} opacity={0.4} />
      <path d="M54 32 L57 34 L54 36" {...S} strokeWidth={1} opacity={0.4} />
      <path d="M57 44 L54 46 L57 48" {...S} strokeWidth={1} opacity={0.4} />
    </svg>
  );
}

/** Sentence diagram / tree — SPOK, kalimat efektif. */
function StructureIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      {/* Root node */}
      <rect x="42" y="10" width="36" height="14" rx="3" {...S} />
      {/* Branches */}
      <line x1="50" y1="24" x2="30" y2="38" {...S} strokeWidth={1} />
      <line x1="60" y1="24" x2="60" y2="38" {...S} strokeWidth={1} />
      <line x1="70" y1="24" x2="90" y2="38" {...S} strokeWidth={1} />
      {/* Leaf nodes */}
      <rect x="16" y="38" width="28" height="12" rx="2" {...S} />
      <rect x="46" y="38" width="28" height="12" rx="2" {...S} />
      <rect x="76" y="38" width="28" height="12" rx="2" {...S} />
      {/* Sub-branches */}
      <line x1="30" y1="50" x2="22" y2="60" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="30" y1="50" x2="38" y2="60" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="90" y1="50" x2="82" y2="60" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="90" y1="50" x2="98" y2="60" {...S} strokeWidth={1} opacity={0.4} />
      {/* Small leaf nodes */}
      <rect x="14" y="60" width="16" height="10" rx="2" {...S} strokeWidth={1} opacity={0.4} />
      <rect x="32" y="60" width="16" height="10" rx="2" {...S} strokeWidth={1} opacity={0.4} />
      <rect x="74" y="60" width="16" height="10" rx="2" {...S} strokeWidth={1} opacity={0.4} />
      <rect x="92" y="60" width="16" height="10" rx="2" {...S} strokeWidth={1} opacity={0.4} />
    </svg>
  );
}

/** Text with accent marks / dictionary — PUEBI, ejaan, kata baku. */
function LanguageIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      {/* Book / dictionary */}
      <rect x="28" y="14" width="44" height="56" rx="3" {...S} />
      <line x1="28" y1="14" x2="28" y2="70" {...S} strokeWidth={2} />
      {/* Headword */}
      <line x1="36" y1="26" x2="64" y2="26" {...S} strokeWidth={1.5} />
      {/* Pronunciation */}
      <line x1="36" y1="34" x2="56" y2="34" {...S} strokeWidth={1} opacity={0.5} />
      {/* Definition lines */}
      <line x1="36" y1="42" x2="64" y2="42" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="36" y1="48" x2="60" y2="48" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="36" y1="54" x2="56" y2="54" {...S} strokeWidth={1} opacity={0.4} />
      {/* Accent marks */}
      <text x="80" y="30" fontSize="18" fill="currentColor" opacity={0.3} fontFamily="serif">é</text>
      <text x="86" y="50" fontSize="14" fill="currentColor" opacity={0.3} fontFamily="serif">ü</text>
    </svg>
  );
}

/** Scroll with decorative elements — legenda, cerita, mitos. */
function StoryIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      {/* Scroll top curl */}
      <path d="M28 18 Q28 10 36 10 L84 10 Q92 10 92 18" {...S} />
      {/* Scroll body */}
      <rect x="28" y="18" width="64" height="44" rx="0" {...S} />
      {/* Scroll bottom curl */}
      <path d="M28 62 Q28 70 36 70 L84 70 Q92 70 92 62" {...S} />
      {/* Text lines */}
      <line x1="36" y1="28" x2="84" y2="28" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="36" y1="36" x2="80" y2="36" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="36" y1="44" x2="76" y2="44" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="36" y1="52" x2="72" y2="52" {...S} strokeWidth={1} opacity={0.4} />
      {/* Decorative star */}
      <circle cx="100" cy="24" r="4" {...S} strokeWidth={1} opacity={0.3} />
    </svg>
  );
}

/** Large quotation marks — majas, pantun, slogan. */
function QuoteDecoIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      {/* Left quote */}
      <path d="M24 36 Q24 20 38 16 L36 24 Q30 26 30 32 L38 32 L38 48 L24 48 Z" {...S} />
      <path d="M46 36 Q46 20 60 16 L58 24 Q52 26 52 32 L60 32 L60 48 L46 48 Z" {...S} />
      {/* Text lines between quotes */}
      <line x1="66" y1="28" x2="100" y2="28" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="66" y1="36" x2="96" y2="36" {...S} strokeWidth={1} opacity={0.4} />
      <line x1="66" y1="44" x2="92" y2="44" {...S} strokeWidth={1} opacity={0.4} />
      {/* Bottom decorative line */}
      <line x1="30" y1="58" x2="90" y2="58" {...S} strokeWidth={1} opacity={0.2} />
    </svg>
  );
}

/** Pen + book composition — literary figures (GB4). */
function LiteraryIll({ className }: IllProps) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      {/* Book stack */}
      <rect x="24" y="44" width="52" height="10" rx="2" {...S} />
      <rect x="26" y="34" width="48" height="10" rx="2" {...S} />
      <rect x="28" y="24" width="44" height="10" rx="2" {...S} />
      {/* Pen on top */}
      <path d="M60 10 L72 10 L66 20 L54 20 Z" {...S} />
      <line x1="63" y1="10" x2="63" y2="20" {...S} strokeWidth={1} />
      {/* Decorative lines */}
      <line x1="84" y1="30" x2="100" y2="30" {...S} strokeWidth={1} opacity={0.3} />
      <line x1="84" y1="38" x2="98" y2="38" {...S} strokeWidth={1} opacity={0.3} />
      <line x1="84" y1="46" x2="96" y2="46" {...S} strokeWidth={1} opacity={0.3} />
      {/* Bookmark */}
      <path d="M78 24 L78 14 L82 18 L86 14 L86 24" {...S} strokeWidth={1} opacity={0.4} />
    </svg>
  );
}

// ─── Illustration Registry ──────────────────────────────────

const ILLUSTRATION_MAP: Record<IllustrationKey, React.ComponentType<IllProps>> = {
  "writing": WritingIll,
  "document": DocumentIll,
  "book": BookIll,
  "poetry": PoetryIll,
  "theater": TheaterIll,
  "speech": SpeechIll,
  "letter": LetterIll,
  "process": ProcessIll,
  "newspaper": NewspaperIll,
  "contrast": ContrastIll,
  "structure": StructureIll,
  "language": LanguageIll,
  "story": StoryIll,
  "quote-deco": QuoteDecoIll,
  "literary": LiteraryIll,
};

export function resolveIllustration(key?: IllustrationKey): React.ComponentType<IllProps> | null {
  return key ? (ILLUSTRATION_MAP[key] ?? null) : null;
}
