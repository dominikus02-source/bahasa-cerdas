/**
 * Canonical dialogue content — Pendekar Suryakerta (P1.5).
 *
 * DATA ONLY (no logic, no React, no DOM). Texts are VERBATIM transcriptions
 * of first-meeting greetings from the legacy prototype. Quest-gated variants
 * (Ki Jaka quest>0, Bu Sari repeat, Eyang post-boss, dst.) belong to the
 * quest engine (P1.7) and are NOT duplicated here — each tree starts at its
 * entry node, always.
 *
 * Effect signals (FLAG/QUEST/GOLD/ITEM/SKILL/REST) transcribe prototype
 * side-effects as DATA. Only REST is applied by the engine (trivial stat
 * set, verbatim full-restore); the rest are unapplied hooks for P1.7,
 * explicitly asserted as unapplied by tests. Nothing here mutates state.
 */

export type DialogueEffectType =
  | "FLAG" | "QUEST" | "GOLD" | "ITEM" | "SKILL" | "REST";

export interface DialogueEffect {
  type: DialogueEffectType;
  /** Flag name (FLAG), quest state (QUEST), amount (GOLD), key+qty (ITEM),
   *  skill key (SKILL). REST carries no params (full HP/MP restore). */
  name?: string;
  amount?: number;
  key?: string;
  quantity?: number;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  /** Linear lines (verbatim). */
  lines: string[];
  /** Alternate variant sets (verbatim; selection is an explicit index —
   *  prototype used Math.random here, which has no place in runtime). */
  variants?: string[][];
  effects?: DialogueEffect[];
  /** Next node id; null/omitted = dialogue ends after this node. */
  next?: string | null;
}

export interface DialogueTree {
  npcId: string;
  dialogueId: string;
  start: string;
  nodes: Record<string, DialogueNode>;
}

/** Where an INTERACT on an NPC routes: dialogue session or shop session. */
export type NpcRoute = "DIALOGUE" | "SHOP";

export const NPC_ROUTING: Record<string, NpcRoute> = {
  ki: "DIALOGUE",
  sari: "DIALOGUE",
  eyang: "DIALOGUE",
  bagas: "DIALOGUE",
  tani: "DIALOGUE",
  pendaki: "DIALOGUE",
  ratmi: "SHOP",
  empu: "SHOP",
};

export function dialogueIdFor(npcId: string): string {
  return `dlg.${npcId}.intro`;
}

export const DIALOGUE_TREES: Record<string, DialogueTree> = {
  ki: {
    npcId: "ki",
    dialogueId: "dlg.ki.intro",
    start: "intro",
    nodes: {
      intro: {
        id: "intro",
        speaker: "Ki Jaka",
        lines: [
          "Nak, kamu sudah datang! Syukurlah...",
          "Para Korog keluar dari Hutan Rimba Larung. Ladang dirusak, warga ketakutan.",
          "Mohon, kalahkan 3 Korog di hutan seberang sungai timur!",
          "Ini bekal 30 G dariku. Bu Ratmi menjual Ramuan. Hati-hati, Nak!",
        ],
        effects: [
          { type: "QUEST", amount: 1 },
          { type: "GOLD", amount: 30 },
        ],
      },
      progress: {
        id: "progress",
        speaker: "Ki Jaka",
        lines: [
          "Bagaimana hutan? Kamu baru mengalahkan {kills} dari 3 Korog.",
          "Tetap waspada, Nak.",
        ],
      },
      report: {
        id: "report",
        speaker: "Ki Jaka",
        lines: [
          "Hebat, Nak! Tapi... ada yang lebih besar: SANG RAJA KOROG!",
          "Sarangnya di Goa Timur, ujung timur laut hutan!",
          "Sebelum pergi, temui Eyang Kartala di timur desa untuk jurus sakti.",
          "Ini 60 G untuk bekalmu. Selamat berjuang, Pendekar!",
        ],
        effects: [
          { type: "QUEST", amount: 2 },
          { type: "GOLD", amount: 60 },
        ],
      },
      bossReward: {
        id: "bossReward",
        speaker: "Ki Jaka",
        lines: [
          "Sungguh luar biasa, Nak! Terimalah 100 G tanda terima kasih seisi desa!",
          "Tapi... malam tadi Gunung Karang MELETUS!",
          "Eyang bilang, Raja Korog hanyalah kecil... yang besar tertidur di puncak: NAGA ABU!",
          "Masuki Goa Timur — ternyata menembus ke jantung gunung!",
          "Siapkan senjata dari Pak Empu, dan temui Eyang!",
        ],
        effects: [
          { type: "FLAG", name: "kiAfter" },
          { type: "QUEST", amount: 4 },
          { type: "GOLD", amount: 100 },
        ],
      },
      bossRepeat: {
        id: "bossRepeat",
        speaker: "Ki Jaka",
        lines: [
          "Goa Timur terbuka ke terowongan gunung, Nak.",
          "Bu Ratmi menjual Teh Gunung sekarang. Pak Empu punya senjata & jasa tempa!",
        ],
      },
      nagaReward: {
        id: "nagaReward",
        speaker: "Ki Jaka",
        lines: [
          "Naga Abu... kalah? Sungguh kah, Nak?!",
          "Nama ARGA akan dikenang seisi desa! Terimalah 200 G!",
          "Dan sekarang... lihatlah puncak gunung. Ada menara berkilau muncul di sana!",
        ],
        effects: [
          { type: "FLAG", name: "kiAfter2" },
          { type: "GOLD", amount: 200 },
        ],
      },
      nagaRepeat: {
        id: "nagaRepeat",
        speaker: "Ki Jaka",
        lines: ["Menara Angin menantimu di puncak, Nak. Temui Eyang untuk nasihat."],
      },
      towerReward: {
        id: "towerReward",
        speaker: "Ki Jaka",
        lines: [
          "LEGENDA NUSANTARA kembali! Seisi desa bersorak untukmu, Nak!",
          "Terimalah 300 G, harta pusaka desa. Kau lebih dari layak!",
        ],
        effects: [
          { type: "FLAG", name: "kiAfter3" },
          { type: "GOLD", amount: 300 },
        ],
      },
      towerRepeat: {
        id: "towerRepeat",
        speaker: "Ki Jaka",
        lines: ["Legenda desa... istirahatlah, Nak. Nammu akan dikenang selamanya."],
      },
      huntElse: {
        id: "huntElse",
        speaker: "Ki Jaka",
        lines: [
          "RAJA KOROG menunggumu di Goa Timur.",
          "Kalau HP habis, minumlah dari sumur desa.",
        ],
      },
    },
  },
  sari: {
    npcId: "sari",
    dialogueId: "dlg.sari.intro",
    start: "intro",
    nodes: {
      intro: {
        id: "intro",
        speaker: "Bu Sari",
        lines: [
          "Aku takut keluar rumah... ada suara aneh dari arah hutan.",
          "Ini, bawalah ramuan ini. Hati-hati ya, Nak.",
          "Oh iya... kata Eyang, ada 3 BUNGA EMAS: di taman desa, rimba timur, dan lereng gunung.",
          "Bisa Kakak carikan semuanya? Untuk jimat penyembuh.",
        ],
        effects: [
          { type: "FLAG", name: "sari" },
          { type: "FLAG", name: "sariQ" },
          { type: "ITEM", key: "ram", quantity: 1 },
        ],
      },
      progress: {
        id: "progress",
        speaker: "Bu Sari",
        lines: [
          "Bunga emasnya baru {flowers} dari 3...",
          "Taman desa, rimba timur, dan lereng gunung ya, Nak.",
        ],
      },
      complete: {
        id: "complete",
        speaker: "Bu Sari",
        lines: [
          "Bunga emas... semua lengkap! Terima kasih, Nak!",
          "Ini jimat buatanku. Membawa keberuntungan dalam pertarungan!",
        ],
        effects: [{ type: "FLAG", name: "charm" }],
      },
      done: {
        id: "done",
        speaker: "Bu Sari",
        lines: ["Jimatnya cocok di badanmu! Terlihat dari sinarmu... hihi."],
      },
    },
  },
  eyang: {
    npcId: "eyang",
    dialogueId: "dlg.eyang.intro",
    start: "intro",
    nodes: {
      intro: {
        id: "intro",
        speaker: "Eyang Kartala",
        lines: [
          "Hmmm... aura pendekar muda yang kuat terasa darimu.",
          "Baiklah, aku ajarkan jurus turun-temurun: MAHAPUKUL!",
          "Nanti kalau levelmu naik, jurus lain akan terbuka dengan sendirinya.",
        ],
        effects: [{ type: "SKILL", key: "maha" }],
      },
      towerDone: {
        id: "towerDone",
        speaker: "Eyang Kartala",
        lines: [
          "Penguasa Menara tunduk... Eyang mendengar gema-nya sampai ke sini!",
          "Kau bukan lagi murid, Arga. Kau LEGENDA.",
          "Menara masih berdiri... kata orang, lantai di atasnya tak berujung.",
        ],
      },
      towerIntro: {
        id: "towerIntro",
        speaker: "Eyang Kartala",
        lines: [
          "Naga Abu tumbang... tapi dengar, Nak. Malam ini langit bergetar!",
          "Dari puncak Gunung Karang, bangkitlah MENARA ANGIN — menara uji para pendekar kuno!",
          "Di dalamnya, monster yang semakin kuat tiap lantai. Di lantai 10 menunggu PENGUASA MENARA.",
          "Masukilah gerbang cahaya di puncak. Buktikan dirimu... LEGENDA NUSANTARA!",
        ],
        effects: [
          { type: "FLAG", name: "towerIntro" },
          { type: "QUEST", amount: 6 },
        ],
      },
      postIntro: {
        id: "postIntro",
        speaker: "Eyang Kartala",
        lines: [
          "Menara menguji kesabaran, bukan cuma kekuatan.",
          "Bawa Ramuan & Teh yang cukup. Golem menjatuhkan Bijih Besi — bawa ke Pak Empu untuk menempa senjatamu!",
        ],
      },
      gunungHint: {
        id: "gunungHint",
        speaker: "Eyang Kartala",
        lines: [
          "Gunung Karang? Au... Eyang dulu pernah mendaki sana.",
          "Jika HP habis, cari Pak Pendaki di tengah jalur.",
          "Dan ingat: Teh Gunung untuk tenaga batinmu (MP).",
        ],
      },
      calmHint: {
        id: "calmHint",
        speaker: "Eyang Kartala",
        lines: [
          "Honing... kilatmu harus tajam seperti padi waktu menyala.",
          "Ingat: sumur desa memulihkan tenagamu.",
        ],
      },
    },
  },
  bagas: {
    npcId: "bagas",
    dialogueId: "dlg.bagas.intro",
    start: "intro",
    nodes: {
      intro: {
        id: "intro",
        speaker: "Bagas",
        lines: [
          "Kak Pendekar! Kata orang, Korog paling takut sama orang berikat kepala merah!",
        ],
        variants: [
          [
            "Kalau kamu kalahkan Raja Korog, aku kasih kamu tempat sembunyi paling apik!",
            "...tempatnya di belakang aku. Hihi.",
          ],
        ],
      },
      bossTalk: {
        id: "bossTalk",
        speaker: "Bagas",
        lines: [
          "Kata Bapak Pendaki, di gunung ada golem yang jalan pelan tapi SAKIT banget kena pukulnya!",
        ],
      },
      nagaTalk: {
        id: "nagaTalk",
        speaker: "Bagas",
        lines: [
          "Kak! Ada menara baru keluar dari puncak gunung! Berkilau-kilau!",
          "Kakak mau naik? Bawa bekal banyak-banyak!",
        ],
      },
      legendTalk: {
        id: "legendTalk",
        speaker: "Bagas",
        lines: [
          "KAK LEGENDA! Kata orang namamu terukir di Menara Angin!",
          "Boleh nggak kakak ajak Bagas naik menara? ...eh, nanti kalau kakak sudah dewasa ya.",
        ],
      },
    },
  },
  tani: {
    npcId: "tani",
    dialogueId: "dlg.tani.intro",
    start: "intro",
    nodes: {
      intro: {
        id: "intro",
        speaker: "Pak Warsa",
        lines: [
          "Ladangku rusak digerus para Korog... terima kasih mau melawan mereka, Nak.",
          "Ambillah hasil jual panenku, plus satu ramuan. Semoga berkah!",
        ],
        effects: [
          { type: "FLAG", name: "tani" },
          { type: "GOLD", amount: 25 },
          { type: "ITEM", key: "ram", quantity: 1 },
        ],
      },
      repeat: {
        id: "repeat",
        speaker: "Pak Warsa",
        lines: [
          "Malam-malam begini, ikan di sungai suka laris dipancing... Coba deh, hadap sungai terus tekan aksi.",
        ],
      },
    },
  },
  pendaki: {
    npcId: "pendaki",
    dialogueId: "dlg.pendaki.intro",
    start: "rest",
    nodes: {
      rest: {
        id: "rest",
        speaker: "Pak Pendaki",
        lines: [
          "Sshh... duduk dekat unggun dulu, Nak. Minum tehnya.",
          "(HP & MP pulih penuh!)",
          "Waspadai GOLEM — kulitnya keras tapi geraknya lambat.",
          "Dan jika menara itu sudah memanggilmu... bawa bekal sebanyak-banyaknya.",
        ],
        effects: [{ type: "REST" }],
      },
      cooldown: {
        id: "cooldown",
        speaker: "Pak Pendaki",
        lines: [
          "Hosh hosh... maaf Nak, api unggun masih dinyalakan ulang.",
          "Kembali lagi beberapa saat lagi.",
        ],
      },
    },
  },
};

export function getDialogueTree(npcId: string): DialogueTree | undefined {
  return DIALOGUE_TREES[npcId];
}
