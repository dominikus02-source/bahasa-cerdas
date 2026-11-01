import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const authClient = read("../lib/supabase/client.ts");
const authServer = read("../lib/supabase/server.ts");
const proxy = read("../lib/supabase/proxy.ts");
const storageConfig = read("../lib/supabase/storage-config.ts");
const storageClient = read("../lib/supabase/storage.ts");
const storageServer = read("../lib/supabase/storage-server.ts");
const upload = read("../lib/upload.ts");

assert.match(authClient, /NEXT_PUBLIC_SUPABASE_AUTH_URL\s*\|\|\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
assert.match(authServer, /NEXT_PUBLIC_SUPABASE_AUTH_URL\s*\|\|\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
assert.match(proxy, /NEXT_PUBLIC_SUPABASE_AUTH_URL\s*\|\|\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
assert.match(storageConfig, /if \(hasDedicatedAuth\(\)\) return null/);
assert.match(storageConfig, /SUPABASE_STORAGE_SERVICE_ROLE_KEY/);
assert.match(storageConfig, /NEXT_PUBLIC_SUPABASE_STORAGE_ANON_KEY/);
assert.match(storageClient, /accessToken:\s*async/);
assert.match(storageServer, /import ["']server-only["']/);
assert.match(upload, /createStorageClient\(\)/);
assert.match(upload, /getStorageAdminConfig\(\)/);
assert.match(upload, /apikey: serviceKey/);
assert.match(upload, /body: JSON.stringify\(\{ file_size_limit: maxSizeBytes \}\)/);
assert.doesNotMatch(upload, /body: JSON.stringify\(\{ public: true, file_size_limit/);

for (const path of [
  "../app/api/upload/avatar/route.ts",
  "../app/api/upload/image/route.ts",
  "../app/api/upload/file/route.ts",
  "../app/api/upload/rekaman/route.ts",
]) {
  const source = read(path);
  assert.match(source, /createStorageAdminClient\(\)/, path + " must use Storage admin client");
  assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_URL/, path + " must not target the legacy shared URL directly");
}

const compose = read("../ops/staging-auth/docker-compose.yml");
const bootstrap = read("../ops/staging-auth/setup-staging-auth.sh");
const caddy = read("../ops/staging-auth/Caddyfile.staging.snippet");
const caddyInstaller = read("../ops/staging-auth/install-staging-caddy.sh");
const provision = read("../scripts/staging-storage-provision.mjs");
const recording = read("../app/api/upload/rekaman/route.ts");
const fileRoute = read("../app/api/upload/file/route.ts");
assert.match(compose, /supabase\/storage-api:v1\.81\.0/);
assert.match(compose, /jumpa_storage_staging_db/);
assert.match(compose, /postgrest\/postgrest:v14\.18/);
assert.match(compose, /PGRST_DB_URI/);
assert.match(compose, /DB_INSTALL_ROLES: "true"/);
assert.match(compose, /storage-private/);
assert.match(compose, /storage-db/);
assert.match(compose, /STORAGE_BACKEND: file/);
assert.match(bootstrap, /STORAGE_DB_PASSWORD/);
assert.match(bootstrap, /AUTHENTICATOR_DB_PASSWORD/);
assert.match(bootstrap, /PGRST_DB_URI/);
assert.match(bootstrap, /init-storage\.sql/);
assert.match(bootstrap, /NEXT_PUBLIC_SUPABASE_STORAGE_URL/);
assert.match(provision, /auth-staging\./);
assert.match(provision, /public: true/);
assert.match(provision, /id: "audio", name: "audio", public: false/);\nassert.match(provision, /visibility differs from required/);
assert.match(caddy, /handle_path \/storage\/v1\/\*/);
assert.match(caddy, /reverse_proxy storage-staging:5000/);
assert.match(caddy, /X-Forwarded-Prefix \/storage\/v1/);
assert.match(caddyInstaller, /STAGING_CADDY_CONTAINER/);
assert.match(caddyInstaller, /dedicated staging Caddy/);
assert.doesNotMatch(caddyInstaller, /bahasacerdas-prod-caddy/);
assert.match(caddyInstaller, /STAGING_CADDY_CONFIG_DIR.*STAGING_ROOT/);

console.log("PASS: Auth and Storage endpoint separation contracts");
console.log("PASS: split Auth without Storage fails closed");
console.log("PASS: upload API routes use server-only Storage credentials");
