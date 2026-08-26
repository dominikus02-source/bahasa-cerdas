"use client"

import TekaTekiSilang from "@/components/game/TTSpage"

/**
 * KUIS TTS — route game fullscreen.
 *
 * Exit/back dikelola DI DALAM komponen (TTSpage): tombol keluar di header
 * (layar awal/gate) dan tombol keluar saat bermain yang MEMBERI KONFIRMASI
 * bila progress akan hilang. Wrapper ini hanya menyediakan kanvas penuh —
 * tidak ada tombol X kedua yang bisa menutup permainan tanpa konfirmasi.
 */
export default function TekaTekiSilangPage() {
  return (
    <div className="game-env game-env-tts fixed inset-0 z-[60]">
      <TekaTekiSilang />
    </div>
  )
}
