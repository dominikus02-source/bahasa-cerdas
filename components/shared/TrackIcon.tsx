import {
  School, BookOpen, GraduationCap, BadgeCheck, Award,
  PencilRuler, Layers, NotebookText, Globe2, ShieldCheck,
  Target, UserCheck,
} from "lucide-react"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  School, BookOpen, GraduationCap, BadgeCheck, Award,
  PencilRuler, Layers, NotebookText, Globe2, ShieldCheck,
  Target, UserCheck,
}

export function TrackIcon({ name, className = "w-5 h-5 text-white" }: { name: string; className?: string }) {
  const Icon = iconMap[name]
  if (!Icon) {
    console.warn(`TrackIcon: unknown icon "${name}"`)
    return null
  }
  return <Icon className={className} />
}
