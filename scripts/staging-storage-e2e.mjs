#!/usr/bin/env node
/**
 * Real Storage API smoke test. Never accepts production or non-HTTPS endpoints.
 * Run only after the staging Storage route is reachable and staging keys are loaded.
 */
import assert from "node:assert/strict";

const baseUrl = (process.env.STAGING_STORAGE_URL || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.STAGING_STORAGE_SERVICE_ROLE_KEY || process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY || "";
if (!baseUrl || !serviceKey) throw new Error("Set STAGING_STORAGE_URL and STAGING_STORAGE_SERVICE_ROLE_KEY");
const endpoint = new URL(baseUrl);
if (endpoint.protocol !== "https:" || !endpoint.hostname.startsWith("auth-staging.")) {
  throw new Error("Refusing non-staging Storage URL");
}
const api = baseUrl + "/storage/v1";
const headers = { apikey: serviceKey, Authorization: "Bearer " + serviceKey };
const bucket = "bc-staging-e2e-" + Date.now();
const objectKey = "probe/isolated-storage-check.txt";
let created = false;

async function call(path, method = "GET", body, extra = {}) {
  const response = await fetch(api + path, {
    method,
    headers: { ...headers, ...(body instanceof Uint8Array ? {} : body ? { "Content-Type": "application/json" } : {}), ...extra },
    ...(body !== undefined ? { body: body instanceof Uint8Array ? body : JSON.stringify(body) } : {}),
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { response, data };
}

try {
  const health = await fetch(baseUrl + "/storage/v1/status");
  assert.equal(health.status, 200, "Storage status must return HTTP 200");
  console.log("PASS: Storage API health");

  const made = await call("/bucket", "POST", { id: bucket, name: bucket, public: false, file_size_limit: 1024 * 1024 });
  assert.ok(made.response.ok, "Create private test bucket failed: " + JSON.stringify(made.data));
  created = true;
  console.log("PASS: create isolated private bucket");

  const payload = new TextEncoder().encode("BahasaCerdas JUMPA staging Storage E2E");
  const uploaded = await call("/object/" + bucket + "/" + objectKey, "POST", payload, { "Content-Type": "text/plain", "x-upsert": "false" });
  assert.ok(uploaded.response.ok, "Upload failed: " + JSON.stringify(uploaded.data));
  console.log("PASS: upload object");

  const publicRead = await fetch(api + "/object/public/" + bucket + "/" + objectKey);
  assert.ok(!publicRead.ok, "Private bucket unexpectedly allowed public read");
  console.log("PASS: private bucket blocks anonymous public read");

  const signed = await call("/object/sign/" + bucket + "/" + objectKey, "POST", { expiresIn: 120 });
  assert.ok(signed.response.ok && signed.data?.signedURL, "Signed URL failed: " + JSON.stringify(signed.data));
  const signedUrl = new URL(signed.data.signedURL, baseUrl);
  assert.equal(signedUrl.hostname, endpoint.hostname, "Signed URL escaped staging host");
  const download = await fetch(signedUrl);
  assert.equal(download.status, 200, "Signed download failed");
  assert.equal(await download.text(), "BahasaCerdas JUMPA staging Storage E2E");
  console.log("PASS: signed download");

  const removed = await call("/object/" + bucket + "/" + objectKey, "DELETE");
  assert.ok(removed.response.ok, "Delete object failed: " + JSON.stringify(removed.data));
  console.log("PASS: delete object");
} finally {
  if (created) {
    const removedBucket = await call("/bucket/" + bucket, "DELETE");
    if (!removedBucket.response.ok) console.error("WARNING: test bucket cleanup failed:", removedBucket.data);
    else console.log("PASS: cleanup test bucket");
  }
}
console.log("STAGING STORAGE API E2E PASS");
