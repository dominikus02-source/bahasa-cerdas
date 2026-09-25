"use client";

import { canonicalItemById } from "../data/items";
import { EQUIPMENT } from "../data/equipment";
import { getCanonicalMap } from "../data/world-maps";
import type { QuestLineState } from "../quests/quest-engine";
import { itemIconFor } from "../rendering/tile-visuals";
import { manifestLookup } from "../rendering/rpg-asset-manifest";

export type RPGMenuTab = "map" | "bag" | "quest";

interface RPGMenuPanelProps {
  tab: RPGMenuTab;
  mapId: string;
  quest: QuestLineState;
  gold: number;
  inventory: Array<{ itemId: string; quantity: number }>;
  equipment: { weaponId: string | null; armorId: string | null; accessoryId: string | null };
  onClose: () => void;
  onEquip: (itemId: string) => void;
}

export function RPGMenuPanel({ tab, mapId, quest, gold, inventory, equipment, onClose, onEquip }: RPGMenuPanelProps) {
  const map = getCanonicalMap(mapId);
  const totalItems = inventory.reduce((n, i) => n + i.quantity, 0);
  const progress = quest.main >= 1 ? Math.min(100, (quest.kills / 3) * 100) : 0;
  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <section className="relative max-h-[90vh] w-[min(760px,94vw)] overflow-auto rounded-[28px] border border-amber-200/20 bg-[#171612]/95 text-stone-100 shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#171612]/95 px-5 py-4 backdrop-blur">
          <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Pendekar Suryakerta</p><h2 className="mt-1 text-xl font-black">{tab === "map" ? "Peta" : tab === "bag" ? "Tas & Perlengkapan" : "Quest"}</h2></div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg hover:bg-white/15" aria-label="Tutup">×</button>
        </header>

        {tab === "map" && <div className="grid gap-4 p-5 md:grid-cols-[1.5fr_1fr]">
          <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-amber-200/10 bg-gradient-to-br from-[#264b35] via-[#355f42] to-[#17291f]">
            <div className="absolute inset-0 opacity-30" style={{backgroundImage:"radial-gradient(circle at 20% 20%,#e8c36a 1px,transparent 2px),radial-gradient(circle at 70% 60%,#b8d38b 1px,transparent 2px)",backgroundSize:"34px 34px,46px 46px"}} />
            <div className="absolute left-[10%] top-[64%] rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-stone-900">Desa Suryakerta</div>
            <div className="absolute left-[52%] top-[34%] rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Gunung Karang</div>
            <div className="absolute right-[8%] top-[12%] rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Menara Angin</div>
            <div className="absolute left-[31%] top-[54%] h-3 w-3 rounded-full bg-white ring-4 ring-white/20" />
            <div className="absolute bottom-4 left-4 rounded-xl bg-black/35 px-3 py-2 text-xs text-white/80">{map?.name ?? mapId}</div>
          </div>
          <div className="space-y-3">
            <Info title="Lokasi" value={map?.name ?? mapId} />
            <Info title="Jejak Korog" value={quest.main >= 1 ? (Math.min(quest.kills, 3) + " / 3 Korog") : "Belum dimulai"} />
            <Info title="Gerbang Gunung" value={quest.main >= 2 ? "Terbuka" : "Terkunci"} />
            <p className="rounded-2xl border border-amber-200/10 bg-white/5 p-4 text-xs leading-relaxed text-stone-300">Peta memandu eksplorasi dan menunjukkan wilayah yang sudah terbuka.</p>
          </div>
        </div>}

        {tab === "quest" && <div className="space-y-3 p-5">
          <div className="rounded-2xl border border-amber-200/15 bg-amber-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-amber-300">Quest utama</p>
            <h3 className="mt-1 text-lg font-black">{quest.main >= 1 ? "Jejak Korog" : "Awal Perjalanan"}</h3>
            <p className="mt-1 text-sm text-stone-300">{quest.main >= 1 ? "Kalahkan Korog dan laporkan hasilnya kepada Ki Jaka." : "Temui Ki Jaka untuk memulai petualangan."}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400" style={{width: progress + "%"}} /></div>
            <p className="mt-2 text-xs font-bold text-amber-200">{quest.main >= 1 ? (Math.min(quest.kills,3) + " / 3 Korog dikalahkan") : "Belum dimulai"}</p>
          </div>
          <Info title="Emas" value={gold + " G"} />
          <Info title="Status dunia" value={quest.main >= 2 ? "Gerbang Gunung terbuka" : "Selesaikan Jejak Korog untuk membuka Gunung"} />
        </div>}

        {tab === "bag" && <div className="grid gap-5 p-5 md:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-black">Inventaris</h3><span className="text-xs text-stone-400">{totalItems} item</span></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {inventory.length ? inventory.map((item) => {
                const def = canonicalItemById(item.itemId);
                const iconId = itemIconFor(item.itemId);
                const icon = iconId ? manifestLookup(iconId) : undefined;
                return <div key={item.itemId} className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-black/20">{icon?.status === "READY" ? <img src={icon.path} alt="" aria-hidden width={40} height={40} className="object-contain" /> : <span aria-hidden className="text-lg">✦</span>}</div><div><div className="text-sm font-black">{def?.name ?? item.itemId}</div><div className="mt-1 text-xs text-amber-300">×{item.quantity}</div></div></div><div className="mt-2 flex items-center justify-between gap-2"><div className="text-[10px] uppercase tracking-wider text-stone-500">{def?.kind ?? "item"}</div>{def && EQUIPMENT.some((e) => e.id === item.itemId) ? <button type="button" onClick={() => onEquip(item.itemId)} className="rounded-lg border border-amber-300/30 bg-amber-400/15 px-2 py-1 text-[10px] font-black text-amber-200 hover:bg-amber-400/25">{equipment.weaponId === item.itemId || equipment.armorId === item.itemId || equipment.accessoryId === item.itemId ? "Lepas" : "Pakai"}</button> : null}</div></div>;
              }) : <p className="col-span-full rounded-2xl bg-white/5 p-5 text-sm text-stone-400">Tas masih kosong.</p>}
            </div>
          </div>
          <div>
            <h3 className="mb-3 font-black">Perlengkapan</h3>
            <div className="space-y-2">
              {(["weaponId","armorId","accessoryId"] as const).map((slot) => {
                const id = equipment[slot];
                const def = id ? EQUIPMENT.find((e) => e.id === id) : null;
                return <div key={slot} className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-[10px] font-black uppercase tracking-widest text-stone-500">{slot.replace("Id","")}</div><div className="mt-1 text-sm font-bold">{def?.name ?? "Kosong"}</div></div>;
              })}
            </div>
            <p className="mt-4 text-xs text-stone-400">State inventaris dan perlengkapan mengikuti penyimpanan RPG.</p>
          </div>
        </div>}
      </section>
    </div>
  );
}

function Info({title,value}:{title:string;value:string}) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-stone-500">{title}</p><p className="mt-1 text-sm font-black text-stone-100">{value}</p></div>;
}
