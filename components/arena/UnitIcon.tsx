import {
  Sprout, PenLine, BookOpen, MessageCircle, Image as ImageIcon, Clipboard,
  BarChart3, Sparkles, Music, Trophy, Dumbbell, Mic, Target,
  Lightbulb, Puzzle, Map, MapPin, Search, Globe, GraduationCap, Headphones,
  Palette, Tag, User, Ear, FileText, MessageSquare, Package, Shuffle,
  RefreshCw, Volume2, Hash, Wrench, Hammer, Cog, Circle, Trash2,
  ArrowRight, ArrowUp, ArrowLeftRight, AlarmClock, Swords, Scale,
  TriangleAlert, Zap, CheckCircle2, XCircle, HelpCircle, Plus, Minus,
  Link2, Ruler, Brain, Scissors, Layers, Type, BookMarked, MessagesSquare,
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
  // Ejaan & bunyi
  "🅰️": (c) => <Type className={c} />,
  "🔤": (c) => <Type className={c} />,
  "✏️": (c) => <PenLine className={c} />,
  "✍️": (c) => <PenLine className={c} />,
  "📝": (c) => <PenLine className={c} />,
  "🎤": (c) => <Mic className={c} />,
  "👂": (c) => <Ear className={c} />,
  "🎧": (c) => <Headphones className={c} />,
  "🔊": (c) => <Volume2 className={c} />,
  "🔢": (c) => <Hash className={c} />,
  "1️⃣": (c) => <Hash className={c} />,
  "🔠": (c) => <Type className={c} />,

  // Kata & makna
  "📚": (c) => <BookOpen className={c} />,
  "📖": (c) => <BookOpen className={c} />,
  "📗": (c) => <BookOpen className={c} />,
  "📄": (c) => <FileText className={c} />,
  "🏷️": (c) => <Tag className={c} />,
  "💬": (c) => <MessageCircle className={c} />,
  "💭": (c) => <MessagesSquare className={c} />,
  "👤": (c) => <User className={c} />,
  "🎓": (c) => <GraduationCap className={c} />,
  "🌍": (c) => <Globe className={c} />,
  "🗺️": (c) => <Map className={c} />,
  "📍": (c) => <MapPin className={c} />,
  "🗑️": (c) => <Trash2 className={c} />,

  // Bentuk kata & imbuhan
  "🧱": (c) => <Layers className={c} />,
  "🧩": (c) => <Puzzle className={c} />,
  "🔨": (c) => <Hammer className={c} />,
  "🔩": (c) => <Cog className={c} />,
  "🔧": (c) => <Wrench className={c} />,
  "📦": (c) => <Package className={c} />,
  "➕": (c) => <Plus className={c} />,
  "➖": (c) => <Minus className={c} />,
  "➡️": (c) => <ArrowRight className={c} />,
  "⬆️": (c) => <ArrowUp className={c} />,
  "🔄": (c) => <RefreshCw className={c} />,
  "🔀": (c) => <Shuffle className={c} />,
  "🔗": (c) => <Link2 className={c} />,

  // Kalimat & tata bahasa
  "📐": (c) => <Ruler className={c} />,
  "⚖️": (c) => <Scale className={c} />,
  "✅": (c) => <CheckCircle2 className={c} />,
  "❌": (c) => <XCircle className={c} />,
  "❓": (c) => <HelpCircle className={c} />,
  "⚠️": (c) => <TriangleAlert className={c} />,
  "⚡": (c) => <Zap className={c} />,
  "⏰": (c) => <AlarmClock className={c} />,
  "🔴": (c) => <Circle className={c} />,
  "🟤": (c) => <Circle className={c} />,
  "↔️": (c) => <ArrowLeftRight className={c} />,

  // Paragraf & wacana
  "📋": (c) => <Clipboard className={c} />,
  "📊": (c) => <BarChart3 className={c} />,
  "📏": (c) => <Ruler className={c} />,
  "🖼️": (c) => <ImageIcon className={c} />,

  // Penalaran & pemahaman
  "🧠": (c) => <Brain className={c} />,
  "🔎": (c) => <Search className={c} />,
  "🔍": (c) => <Search className={c} />,

  // Menulis & mahir
  "✂️": (c) => <Scissors className={c} />,
  "🎨": (c) => <Palette className={c} />,
  "⚔️": (c) => <Swords className={c} />,
  "🌱": (c) => <Sprout className={c} />,
  "🎶": (c) => <Music className={c} />,
  "💪": (c) => <Dumbbell className={c} />,
  "🎭": (c) => <Sparkles className={c} />,
  "🌟": (c) => <Sparkles className={c} />,
  "🎯": (c) => <Target className={c} />,
  "🏆": (c) => <Trophy className={c} />,
  "💡": (c) => <Lightbulb className={c} />,
  "📘": (c) => <BookMarked className={c} />,
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
