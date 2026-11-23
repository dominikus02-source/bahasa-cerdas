-- Data adapted from lib/arena/game-registry.ts (main, 23 Nov 2026).
-- Step 1: showcase only. PlaceId stays nil until Step 2.
local catalog = {
 {id="benar-salah",name="Benar atau Salah",category="Cepat",description="Uji pernyataan Bahasa Indonesia",level="Bertahap",players="Solo"},
 {id="susun-kata",name="Susun Kata",category="Kata",description="Rangkai huruf menjadi kata",level="12 tingkat",players="Solo"},
 {id="tebak-kata",name="Tebak Kata",category="Kata",description="Tebak istilah dari petunjuk",level="Bertahap",players="Solo"},
 {id="lari-kata",name="Lari Kata",category="Cepat",description="20 soal dalam 60 detik",level="Cepat",players="Solo"},
 {id="menara",name="Menara Cerdas",category="Tantangan",description="Naik lantai dengan jawaban benar",level="8/12/20 lantai",players="Solo"},
 {id="bermain-kata",name="Bermain Kata",category="Kata",description="Susun, rumpang, pasangan, makna",level="TK–SD",players="Solo"},
 {id="petualangan-kata",name="Petualangan Kata",category="Kata",description="Pilih kata bersama Zelby",level="Bertahap",players="Solo"},
 {id="irama-kata",name="Irama Kata",category="Cepat",description="Ketuk kata pada empat jalur",level="15 tingkat",players="Solo"},
 {id="teka-teki-silang",name="Teka-Teki Silang",category="Literasi",description="Pecahkan petunjuk silang",level="12 tingkat",players="Solo"},
 {id="tantang",name="Tantang Teman",category="Kompetitif",description="Duel 10 soal secara bergantian",level="Kompetitif",players="Dua pemain"},
 {id="adu-cepat",name="Adu Cepat",category="Kompetitif",description="Lomba jawab secara langsung",level="Kompetitif",players="2–8 pemain"},
 {id="kuis-tempur",name="Kuis Tempur",category="Tantangan",description="Jawab kuis dalam arena",level="Bertahap",players="Solo/multi"},
 {id="rpg",name="Pendekar Suryakerta",category="Tantangan",description="Petualangan dunia Bahasa Indonesia",level="Akses terbatas",players="Solo",unpublished=true},
}
return catalog
