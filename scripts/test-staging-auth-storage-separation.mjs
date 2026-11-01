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
  "../app/api/ai/ilustrasi/route.ts",
  "../app/api/audio-proxy/route.ts",
  "../app/api/kompetensi/audio/[questionId]/route.ts",
]) {
  const source = read(path);
  assert.match(source, /createStorageAdminClient\(\)/, path + " must use Storage admin client");
  assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_URL/, path + " must not target the legacy shared URL directly");
}

const compose = read("../ops/staging-auth/docker-compose.yml");
const bootstrap = read("../ops/staging-auth/setup-staging-auth.sh");
const caddy = read("../ops/staging-auth/Caddyfile.staging.snippet");
const caddyInstaller = read("../ops/staging-auth/install-staging-caddy.sh");
const backup = read("../ops/staging-auth/backup-staging-auth-storage.sh");
const provision = read("../scripts/staging-storage-provision.mjs");
const recording = read("../app/api/upload/rekaman/route.ts");
const fileRoute = read("../app/api/upload/file/route.ts");

assert.match(recording, /AUDIO_MIMES/);
assert.match(recording, /public: false/);
assert.match(recording, /createSignedUrl/);
assert.doesNotMatch(recording, /updateBucket\(bucket, \{ public: true \}\)/);
assert.match(fileRoute, /folder\.length > 40/);
assert.match(fileRoute, /\^\[a-zA-Z0-9_-\]\+\$/);
assert.match(compose, /supabase\/storage-api:v1\.81\.0/);
assert.match(compose, /jumpa_storage_staging_db/);
assert.match(compose, /postgrest\/postgrest:v14\.18/);
assert.match(compose, /PGRST_DB_URI/);
assert.match(compose, /DB_INSTALL_ROLES: "true"/);
assert.match(compose, /storage-private/);
assert.match(compose, /storage-db/);
assert.doesNotMatch(compose, /rest:\s*\n\s*condition: service_healthy/);
assert.match(compose, /STORAGE_BACKEND: file/);
assert.match(bootstrap, /STORAGE_DB_PASSWORD/);
assert.match(bootstrap, /AUTHENTICATOR_DB_PASSWORD/);
assert.match(bootstrap, /PGRST_DB_URI/);
assert.match(bootstrap, /init-storage\.sql/);
assert.match(bootstrap, /NEXT_PUBLIC_SUPABASE_STORAGE_URL/);
assert.match(provision, /auth-staging\./);
assert.match(provision, /public: true/);
assert.match(provision, /id: "audio", name: "audio", public: false/);
assert.match(provision, /visibility differs from required/);
assert.match(caddy, /handle_path \/storage\/v1\/\*/);
assert.match(caddy, /reverse_proxy storage-staging:5000/);
assert.match(caddy, /X-Forwarded-Prefix \/storage\/v1/);
assert.match(caddyInstaller, /STAGING_CADDY_CONTAINER/);
assert.match(caddyInstaller, /dedicated staging Caddy/);
assert.doesNotMatch(caddyInstaller, /bahasacerdas-prod-caddy/);
assert.match(caddyInstaller, /STAGING_CADDY_CONFIG_DIR.*STAGING_ROOT/);
assert.match(backup, /jumpa-auth-db-staging/);
assert.match(backup, /jumpa-storage-db-staging/);
assert.match(backup, /jumpa_storage_staging_files/);
assert.match(backup, /sha256sum -c SHA256SUMS/);

console.log("PASS: Auth and Storage endpoint separation contracts");
console.log("PASS: split Auth without Storage fails closed");
console.log("PASS: upload API routes use server-only Storage credentials");

for (const path of ["../lib/supabase/server-login.ts", "../app/api/auth/forgot-password/route.ts", "../app/api/auth/create-user/route.ts", "../lib/account/security.ts"]) {
  const source = read(path);
  assert.match(source, /NEXT_PUBLIC_SUPABASE_AUTH_URL/, path + " must resolve dedicated Auth endpoint");
  assert.match(source, /SUPABASE_AUTH_(ANON|SERVICE_ROLE)_KEY/, path + " must use dedicated Auth credentials");
}
console.log("PASS: login, recovery, registration and reauthentication use dedicated Auth");

// A root-only SQL file must be piped from the host, never read by the container UID.
assert.doesNotMatch(compose, /init-storage\.sql:\/docker-entrypoint-initdb\.d/);
assert.match(bootstrap, /docker exec -i -u postgres jumpa-storage-db-staging psql -X -v ON_ERROR_STOP=1 -d storage < "\$ROOT\/init-storage\.sql"/);
assert.ok(bootstrap.indexOf('up -d auth-db storage-db') < bootstrap.indexOf('psql -X -v ON_ERROR_STOP=1'));
assert.ok(bootstrap.indexOf('psql -X -v ON_ERROR_STOP=1') < bootstrap.lastIndexOf('up -d\n'));
console.log("PASS: private Storage init SQL uses host stdin before API startup");

assert.match(bootstrap, /docker exec -i -u postgres jumpa-auth-db-staging psql -X -v ON_ERROR_STOP=1 -U gotrue -d gotrue/);
assert.match(bootstrap, /CREATE ROLE postgres NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS/);
assert.ok(bootstrap.indexOf('CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION gotrue') < bootstrap.lastIndexOf('up -d\n'));
console.log("PASS: dedicated GoTrue auth schema exists before API startup");

assert.match(bootstrap, /CREATE SCHEMA IF NOT EXISTS extensions AUTHORIZATION postgres/);
console.log("PASS: Storage database provisions PostgREST extra search-path schema");

assert.match(compose, /PGRST_ADMIN_SERVER_PORT: "3001"/);
assert.match(compose, /PGRST_SERVER_HOST: 0\.0\.0\.0/);
console.log("PASS: PostgREST readiness probe has an enabled internal admin endpoint");

assert.match(compose, /GOTRUE_DB_DATABASE_URL: .*search_path=auth,public/);
assert.match(bootstrap, /ALTER ROLE gotrue IN DATABASE gotrue SET search_path = auth, public/);
console.log("PASS: isolated Auth runtime connections resolve the migrated auth schema");
