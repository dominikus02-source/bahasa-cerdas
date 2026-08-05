"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Share2, Check, Link2 } from "lucide-react"

function WhatsAppIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
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

  const shareWhatsApp = () => {
    setOpen(false)
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText())}`,
      "_blank",
      "noopener,noreferrer"
    )
  }

  const copyLink = () => {
    const url = getUrl()
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
        setOpen(false)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Bagikan karya"
        title="Bagikan karya"
        className={`flex items-center gap-1.5 text-sm transition-all hover:text-violet-500 ${copied ? "text-emerald-500" : "text-gray-400"} ${className}`}
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
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white p-5 pb-8"
            >
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />
              <p className="text-base font-bold text-gray-900 mb-1">Bagikan Karya</p>
              <p className="text-xs text-gray-400 mb-4 line-clamp-1">{title}</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={shareWhatsApp}
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-gray-100 bg-green-50 text-green-600 font-semibold text-sm transition-all hover:bg-green-100 active:scale-[0.97]"
                >
                  <WhatsAppIcon size={26} />
                  WhatsApp
                </button>
                <button
                  onClick={copyLink}
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-gray-100 bg-violet-50 text-violet-600 font-semibold text-sm transition-all hover:bg-violet-100 active:scale-[0.97]"
                >
                  <Link2 size={24} />
                  {copied ? "Tersalin!" : "Salin Tautan"}
                </button>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="mt-3 w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
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