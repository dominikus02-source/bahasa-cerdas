import { Users, Star, FileText, Sparkles } from "lucide-react"

export default function SocialProof() {
  const stats = [
    { icon: Users, value: "100+", label: "Guru Bergabung", color: "text-red-600", bg: "bg-red-50" },
    { icon: Star, value: "4.8", label: "Rating Platform", color: "text-yellow-600", bg: "bg-yellow-50" },
    { icon: FileText, value: "500+", label: "RPP & Modul", color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Sparkles, value: "10+", label: "AI Tools", color: "text-purple-600", bg: "bg-purple-50" },
  ]

  return (
    <section className="py-12 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div className={`w-16 h-16 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-8 h-8" />
              </div>
              <p className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-1">{stat.value}</p>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
