"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

export default function DeleteKaryaButton({ karyaId, isOwner }: { karyaId: string; isOwner: boolean }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  if (!isOwner) return null

  const handleDelete = async () => {
    if (!confirm("Yakin ingin menghapus karya ini? Tindakan ini tidak bisa dibatalkan.")) return
    setDeleting(true)
    const res = await fetch(`/api/siswa/karya/${karyaId}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/arena/feed")
    } else {
      alert("Gagal menghapus karya. Silakan coba lagi.")
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
    >
      {deleting ? (
        <div className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full" />
      ) : (
        <Trash2 size={15} />
      )}
      Hapus
    </button>
  )
}
