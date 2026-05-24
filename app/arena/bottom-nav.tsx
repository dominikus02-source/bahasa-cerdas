"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Compass, Flame, Gamepad2, MessageCircle } from "lucide-react"

const items = [
  { href: "/arena", label: "Beranda", icon: Compass },
  { href: "/arena/feed", label: "Karya", icon: Flame },
  { href: "/arena/game", label: "Gim", icon: Gamepad2 },
  { href: "/arena/chat", label: "Chat", icon: MessageCircle },
]

export function BottomNav() {
  const path = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-xl md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const aktif = path === item.href || (item.href !== "/arena" && path.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-all relative ${
                aktif ? "text-violet-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {aktif && <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-violet-600 rounded-full" />}
              <item.icon className={`w-5 h-5 ${aktif ? "drop-shadow-sm" : ""}`} />
              <span className={`text-[10px] ${aktif ? "font-bold" : "font-medium"}`}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
