#!/usr/bin/env node
/**
 * Provision the application's current Storage buckets without broadening access.
 * Shared learning assets remain public for compatibility; recordings are private.
 * Existing buckets with a different visibility fail closed for manual review.
 */
const baseUrl = (process.env.STAGING_STORAGE_URL || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.STAGING_STORAGE_SERVICE_ROLE_KEY || process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY || "";
if (!baseUrl || !serviceKey) throw new Error("Set STAGING_STORAGE_URL and STAGING_STORAGE_SERVICE_ROLE_KEY");
const parsed = new URL(baseUrl);
if (parsed.protocol !== "https:" || !parsed.hostname.startsWith("auth-staging.")) throw new Error("Refusing non-staging Storage URL");
const api = baseUrl + "/storage/v1";
const headers = { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" };
const buckets = [
  { id: "avatars", name: "avatars", public: true, file_size_limit: 5 * 1024 * 1024 },
  { id: "documents", name: "documents", public: true, file_size_limit: 50 * 1024 * 1024 },
  { id: "videos", name: "videos", public: true, file_size_limit: 500 * 1024 * 1024 },
  { id: "audio", name: "audio", public: false, file_size_limit: 25 * 1024 * 1024 },
];
async function request(path, method = "GET", body) {
  const response = await fetch(api + path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { response, data };
}
for (const bucket of buckets) {
  const existing = await request("/bucket/" + bucket.id);
  if (existing.response.status === 404) {
    const created = await request("/bucket", "POST", bucket);
    if (!created.response.ok) throw new Error("Cannot create " + bucket.id + ": " + JSON.stringify(created.data));
    console.log("CREATED " + (bucket.public ? "public" : "private") + " bucket:", bucket.id);
    continue;
  }
  if (!existing.response.ok) throw new Error("Cannot inspect " + bucket.id + ": " + JSON.stringify(existing.data));
  if (existing.data?.public !== bucket.public) {
    throw new Error("STOP: bucket " + bucket.id + " visibility differs from required " +
      (bucket.public ? "public" : "private") + ". Review existing object access and migrate deliberately; no visibility is changed automatically.");
  }
  if (Number(existing.data.file_size_limit || 0) < bucket.file_size_limit) {
    const updated = await request("/bucket/" + bucket.id, "PUT", { file_size_limit: bucket.file_size_limit });
    if (!updated.response.ok) throw new Error("Cannot update size for " + bucket.id + ": " + JSON.stringify(updated.data));
  }
  console.log("PASS " + (bucket.public ? "public" : "private") + " bucket:", bucket.id);
}
console.log("STAGING STORAGE BUCKET PROVISIONING PASS");
