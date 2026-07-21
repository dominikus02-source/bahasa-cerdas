import {
  Sprout, PenLine, BookOpen, MessageCircle, Image as ImageIcon, Clipboard,
  BarChart3, Sparkles, Music, Trophy, Dumbbell, Mic, Target,
} from "lucide-react"
import type { ReactNode } from "react"

// Learning units carry an emoji in the database, but emoji are never rendered
// as icons in the UI: they are sized and styled by the operating system, so the
// same screen looks different on iOS, Android and Windows and the colours
// cannot be controlled — the quickest way to make a product look cheap.
//
// The emoji is treated purely as a key here, mapped to a real vector icon that
// inherits the surrounding size and colour. This map used to live inside the
// Jalur Cerdas page; it is shared so the Arena home renders the same unit with
// the same icon.
const ICON_BY_EMOJI: Record<string, (cls: string) => ReactNode> = {
  "🌱": (c) => <Sprout className={c} />,
  "✏️": (c) => <PenLine className={c} />,
  "📖": (c) => <BookOpen className={c} />,
  "💬": (c) => <MessageCircle className={c} />,
  "📝": (c) => <PenLine className={c} />,
  "📚": (c) => <BookOpen className={c} />,
  "🖼️": (c) => <ImageIcon className={c} />,
  "📋": (c) => <Clipboard className={c} />,
  "📊": (c) => <BarChart3 className={c} />,
  "🎭": (c) => <Sparkles className={c} />,
  "🌟": (c) => <Sparkles className={c} />,
  "🎶": (c) => <Music className={c} />,
  "🏆": (c) => <Trophy className={c} />,
  "💪": (c) => <Dumbbell className={c} />,
  "🎤": (c) => <Mic className={c} />,
  "🎯": (c) => <Target className={c} />,
}

/**
 * Renders the icon for a learning unit. Falls back to a book for any emoji the
 * map does not know, so a new one seeded into the database degrades to a real
 * icon rather than leaking a system emoji into the interface.
 */
export function UnitIcon({
  emoji,
  className = "w-5 h-5",
}: {
  emoji?: string | null
  className?: string
}) {
  const render = (emoji && ICON_BY_EMOJI[emoji]) || ((c: string) => <BookOpen className={c} />)
  return <>{render(className)}</>
}
