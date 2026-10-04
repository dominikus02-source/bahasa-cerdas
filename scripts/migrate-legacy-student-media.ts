/**
 * Migrate legacy student-owned public Supabase media to the private student bucket.
 *
 * Safety:
 * - DRY RUN by default.
 * - --execute copies first, then rewrites DB references.
 * - old public source objects are retained unless --delete-source is ALSO passed.
 * - only URLs from THIS Supabase project using /storage/v1/object/public/... are touched.
 * - only MURID avatars and StudentKarya cover/photos are in scope.
 *
 * Examples:
 *   npx tsx scripts/migrate-legacy-student-media.ts
 *   npx tsx scripts/migrate-legacy-student-media.ts --execute
 *   npx tsx scripts/migrate-legacy-student-media.ts --execute --delete-source
 */
import { randomUUID } from "node:crypto";
import { db } from "../lib/db";
import { storageAdmin, PRIVATE_BUCKET } from "../lib/compliance/assets";

type LegacyRef = {
  ownerId: string;
  sourceUrl: string;
  bucket: string;
  path: string;
  refs: Array<
    | { kind: "avatar"; userId: string }
    | { kind: "cover"; karyaId: string }
    | { kind: "photo"; karyaId: string; index: number }
  >;
};

const execute = process.argv.includes("--execute");
const deleteSource = process.argv.includes("--delete-source");
if (deleteSource && !execute) throw new Error("--delete-source requires --execute");

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
const expectedHost = new URL(base).host;

function parseLegacy(url: string | null | undefined) {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.host !== expectedHost) return null;
  const prefix = "/storage/v1/object/public/";
  if (!u.pathname.startsWith(prefix)) return null;
  const rest = decodeURIComponent(u.pathname.slice(prefix.length));
  const slash = rest.indexOf("/");
  if (slash <= 0 || slash === rest.length - 1) return null;
  const bucket = rest.slice(0, slash);
  const path = rest.slice(slash + 1);
  if (!["avatars","images","documents","audio","videos"].includes(bucket)) return null;
  if (path.includes("..")) return null;
  return { bucket, path };
}

function extFor(path: string, contentType?: string | null) {
  const raw = path.split("/").pop()?.split("?")[0] || "";
  const m = raw.match(/\.([a-zA-Z0-9]{1,8})$/);
  if (m) return m[1].toLowerCase();
  const byMime: Record<string,string> = {
    "image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif",
    "audio/webm":"webm","audio/mp4":"mp4","application/pdf":"pdf"
  };
  return contentType ? (byMime[contentType] || "bin") : "bin";
}

async function main() {
  const [students, works] = await Promise.all([
    db.user.findMany({ where: { role: "MURID", avatar: { not: null } }, select: { id: true, avatar: true } }),
    db.studentKarya.findMany({ select: { id: true, userId: true, coverImage: true, photos: true } }),
  ]);

  const map = new Map<string, LegacyRef>();
  const add = (ownerId: string, sourceUrl: string | null | undefined, ref: LegacyRef["refs"][number]) => {
    const parsed = parseLegacy(sourceUrl);
    if (!parsed || !sourceUrl) return;
    const key = ownerId + "\n" + sourceUrl;
    const existing = map.get(key);
    if (existing) existing.refs.push(ref);
    else map.set(key, { ownerId, sourceUrl, ...parsed, refs: [ref] });
  };

  for (const u of students) add(u.id, u.avatar, { kind: "avatar", userId: u.id });
  for (const w of works) {
    add(w.userId, w.coverImage, { kind: "cover", karyaId: w.id });
    w.photos.forEach((url, index) => add(w.userId, url, { kind: "photo", karyaId: w.id, index }));
  }

  const refs = [...map.values()];
  const summary = {
    mode: execute ? (deleteSource ? "execute-and-delete-source" : "execute-copy-rewrite") : "dry-run",
    projectHost: expectedHost,
    studentsScanned: students.length,
    worksScanned: works.length,
    uniqueLegacyObjects: refs.length,
    byBucket: refs.reduce<Record<string,number>>((a,r)=>(a[r.bucket]=(a[r.bucket]||0)+1,a),{}),
    avatarRefs: refs.flatMap(r=>r.refs).filter(r=>r.kind==="avatar").length,
    coverRefs: refs.flatMap(r=>r.refs).filter(r=>r.kind==="cover").length,
    photoRefs: refs.flatMap(r=>r.refs).filter(r=>r.kind==="photo").length,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!execute || refs.length === 0) return;

  const storage = storageAdmin().storage;
  const copied: Array<{ ref: LegacyRef; privatePath: string; privateUrl: string }> = [];

  for (const ref of refs) {
    const { data, error } = await storage.from(ref.bucket).download(ref.path);
    if (error || !data) throw new Error(`download failed: ${ref.bucket}/${ref.path}: ${error?.message || "no data"}`);
    const ext = extFor(ref.path, data.type);
    const privatePath = `${ref.ownerId}/${randomUUID()}.${ext}`;
    const bytes = Buffer.from(await data.arrayBuffer());
    const uploaded = await storage.from(PRIVATE_BUCKET).upload(privatePath, bytes, {
      contentType: data.type || "application/octet-stream",
      cacheControl: "0",
      upsert: false,
    });
    if (uploaded.error) throw new Error(`private upload failed: ${privatePath}: ${uploaded.error.message}`);
    copied.push({ ref, privatePath, privateUrl: `/api/privacy/assets?path=${encodeURIComponent(privatePath)}` });
  }

  // Rewrite DB only after every source object has been copied successfully.
  await db.$transaction(async tx => {
    const avatarUpdates = new Map<string,string>();
    const karya = new Map<string,{cover?:string; photos?:Map<number,string>}>();

    for (const item of copied) {
      for (const r of item.ref.refs) {
        if (r.kind === "avatar") avatarUpdates.set(r.userId, item.privateUrl);
        else {
          const itemPatch = karya.get(r.karyaId) || {};
          if (r.kind === "cover") itemPatch.cover = item.privateUrl;
          else {
            itemPatch.photos ||= new Map();
            itemPatch.photos.set(r.index, item.privateUrl);
          }
          karya.set(r.karyaId, itemPatch);
        }
      }
    }

    for (const [userId, avatar] of avatarUpdates) {
      await tx.user.update({ where: { id: userId }, data: { avatar } });
    }
    for (const [karyaId, patch] of karya) {
      const current = await tx.studentKarya.findUniqueOrThrow({ where: { id: karyaId }, select: { photos: true } });
      const photos = [...current.photos];
      if (patch.photos) for (const [index,url] of patch.photos) photos[index] = url;
      await tx.studentKarya.update({ where: { id: karyaId }, data: { ...(patch.cover ? { coverImage: patch.cover } : {}), photos } });
    }
  }, { timeout: 120000 });

  if (deleteSource) {
    // Deletion is deliberately last: the application already points at private copies.
    const grouped = new Map<string,string[]>();
    for (const { ref } of copied) {
      const arr = grouped.get(ref.bucket) || [];
      if (!arr.includes(ref.path)) arr.push(ref.path);
      grouped.set(ref.bucket, arr);
    }
    for (const [bucket, paths] of grouped) {
      for (let i=0;i<paths.length;i+=100) {
        const { error } = await storage.from(bucket).remove(paths.slice(i,i+100));
        if (error) throw new Error(`source cleanup failed in ${bucket}: ${error.message}`);
      }
    }
  }

  console.log(JSON.stringify({
    ok: true,
    copied: copied.length,
    sourceDeleted: deleteSource,
    warning: deleteSource ? null : "Old public objects still exist; run the explicit delete-source phase only after verification.",
  }, null, 2));
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
