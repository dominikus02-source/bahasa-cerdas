import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

export async function GET(req: NextRequest) {
  try {
    const prompt = req.nextUrl.searchParams.get("prompt")
    if (!prompt || prompt.length < 3) {
      return NextResponse.json({ error: "Prompt minimal 3 karakter" }, { status: 400 })
    }

    const hash = crypto.createHash("md5").update(prompt).digest("hex")
    const fileName = `ilustrasi/${hash}.jpg`

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: existing } = await supabase.storage.from("images").list("ilustrasi", {
      search: `${hash}.jpg`,
    })

    if (existing && existing.length > 0) {
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName)
      return NextResponse.json({ url: urlData.publicUrl, cached: true })
    }

    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY
    if (!unsplashKey || unsplashKey === "isi_disini") {
      throw new Error("UNSPLASH_ACCESS_KEY belum diisi di .env")
    }

    const searchQuery = encodeURIComponent(
      prompt + " pendidikan sekolah belajar ilustrasi"
    )
    const unsplashRes = await fetch(
      `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${unsplashKey}` } }
    )

    if (!unsplashRes.ok) {
      throw new Error(`Unsplash error: ${unsplashRes.status}`)
    }

    const unsplashData = await unsplashRes.json()
    const photo = unsplashData.results?.[0]

    if (!photo) {
      throw new Error("Tidak menemukan gambar yang cocok di Unsplash")
    }

    const imageUrl = photo.urls.regular

    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) })
    if (!imgRes.ok) {
      throw new Error(`Gagal download gambar: ${imgRes.status}`)
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer())

    const { error: uploadError } = await supabase.storage.from("images").upload(fileName, buffer, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: true,
    })

    if (uploadError) {
      throw new Error(`Upload gagal: ${uploadError.message}`)
    }

    const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName)
    return NextResponse.json({
      url: urlData.publicUrl,
      cached: false,
      credit: { name: photo.user.name, link: photo.links.html },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal mengambil ilustrasi" }, { status: 500 })
  }
}
