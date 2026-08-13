"use client"

import { useState, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Share2, Check, Link2, Mail, Send } from "lucide-react"

function WhatsAppIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

function TelegramIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#229ED9">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

function FacebookIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function XIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#000000">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  )
}

type ShareTarget = {
  id: string
  label: string
  icon: ReactNode
  href: (text: string, url: string) => string
  bg: string
}

export default function ShareKaryaButton({
  karyaId,
  title,
  className = "",
}: {
  karyaId: string
  title: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const getUrl = () =>
    `${typeof window !== "undefined" ? window.location.origin : "https://bahasacerdas.com"}/arena/feed/${karyaId}`

  const shareText = () => `Lihat karya "${title}" di BahasaCerdas! ${getUrl()}`

  const targets: ShareTarget[] = [
    {
      id: "wa",
      label: "WhatsApp",
      icon: <WhatsAppIcon size={26} />,
      href: (text) => `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      bg: "bg-green-50 dark:bg-green-950/40 hover:bg-green-100",
    },
    {
      id: "telegram",
      label: "Telegram",
      icon: <TelegramIcon size={24} />,
      href: (text, url) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      bg: "bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100",
    },
    {
      id: "facebook",
      label: "Facebook",
      icon: <FacebookIcon size={24} />,
      href: (_text, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      bg: "bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100",
    },
    {
      id: "x",
      label: "X",
      icon: <XIcon size={22} />,
      href: (text, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      bg: "bg-gray-100 dark:bg-slate-800/80 hover:bg-gray-200",
    },
    {
      id: "email",
      label: "Email",
      icon: <Mail size={24} className="text-gray-600 dark:text-slate-300" />,
      href: (text, url) =>
        `mailto:?subject=${encodeURIComponent(`Karya di BahasaCerdas: ${title}`)}&body=${encodeURIComponent(text)}`,
 bg: "bg-gray-50 dark:bg-slate-800/60 hover:bg-gray-100 ",
    },
    {
      id: "salin",
      label: copied ? "Tersalin!" : "Salin Tautan",
      icon: <Link2 size={24} className="text-violet-600 dark:text-violet-400" />,
      href: () => getUrl(),
      bg: "bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100",
    },
  ]

  const openUrl = (target: ShareTarget) => {
    setOpen(false)
    const href = target.href(shareText(), getUrl())
    if (target.id === "salin") {
      copyToClipboard(href)
      return
    }
    window.open(href, "_blank", "noopener,noreferrer")
  }

  const copyToClipboard = (url: string) => {
    navigator.clipboard
      .writeText(url)
      .catch(() => {
        const ta = document.createElement("textarea")
        ta.value = url
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
      })
      .finally(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
  }

  const shareNative = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({ title: `Karya: ${title}`, text: shareText(), url: getUrl() })
        .catch(() => {})
    }
  }

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Bagikan karya"
        title="Bagikan karya"
        className={`flex items-center gap-1.5 text-sm transition-all ${copied ? "text-emerald-500 dark:text-emerald-400" : ""} ${className}`}
      >
        <Share2 size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.45)" }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white dark:bg-slate-800/90 p-5 pb-8"
            >
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />
              <p className="text-base font-bold text-gray-900 dark:text-slate-100 mb-1">Bagikan Karya</p>
              <p className="text-xs text-gray-400 mb-5 line-clamp-1">{title}</p>

              <div className="grid grid-cols-4 gap-2">
                {targets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openUrl(t)}
                    className={`flex flex-col items-center gap-2 py-4 rounded-2xl border border-gray-100 dark:border-slate-800 font-semibold text-xs text-gray-600 transition-all active:scale-[0.95] ${t.bg}`}
                  >
                    {t.icon}
                    <span className="line-clamp-1 px-1">{t.label}</span>
                  </button>
                ))}
                {canNativeShare && (
                  <button
                    onClick={() => {
                      setOpen(false)
                      shareNative()
                    }}
                    className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-emerald-50 hover:bg-emerald-100 font-semibold text-xs text-gray-600 transition-all active:scale-[0.95]"
                  >
                    <Send size={22} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="line-clamp-1 px-1">Lainnya...</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setOpen(false)}
                className="mt-4 w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-slate-800/80 hover:bg-gray-200 transition-all"
              >
                Tutup
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}