/* Real staging HTTP/Auth check. No browser/media claim and no mail delivery.
 * Disposable users are created confirmed, roles assigned in the staging DB,
 * passwords/tokens stay in process memory, and fixtures are removed.
 */
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');
const { PrismaClient } = require('@prisma/client');
assert.equal(process.env.BC_BUILD_ENV, 'staging');
assert.equal(process.env.NEXT_PUBLIC_SITE_URL, 'https://staging.bahasacerdas.com');
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'https://auth-staging.bahasacerdas.com');
assert.equal(new URL(process.env.DATABASE_URL).pathname, '/jumpa_staging');
const origin = process.env.NEXT_PUBLIC_SITE_URL;
const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(authUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const db = new PrismaClient();
const fixtures = [];
let step = 'anonymous';
let failed = false;
const pass = check => console.log(JSON.stringify({ check, passed: true, kind: 'HTTP integration; not browser/media' }));
async function request(path, cookies = new Map()) {
  const cookie = [...cookies].map(([k,v]) => k + '=' + v).join('; ');
  const r = await fetch(origin + path, {
    headers: cookie ? { Cookie: cookie } : {},
    signal: AbortSignal.timeout(20000),
  });
  return { status: r.status, body: await r.json() };
}
function userOf(body) { return body.user ?? body.data?.user ?? null; }
(async () => {
 try {
  let r = await request('/api/user/me?fresh=1');
  assert.equal(r.status, 200); assert.equal(userOf(r.body), null);
  r = await request('/api/jumpa/rooms/aaa-bbbb-ccc');
  assert.equal(r.status, 401);
  pass('anonymous session and protected JUMPA route');
  for (const role of ['GURU','MURID']) {
    step = role + ':provision';
    const email = 'cache-qa-' + role.toLowerCase() + '-' + randomBytes(8).toString('hex') + '@example.invalid';
    const password = randomBytes(32).toString('base64url');
    const made = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      app_metadata: { role }, user_metadata: { full_name: 'Staging Cache QA' },
    });
    assert.equal(made.error, null);
    const f = { email, authId: made.data.user.id, dbId: null, client: null };
    fixtures.push(f);
    const row = await db.user.create({ data: {
      supabaseId: f.authId, email, fullName: 'Staging Cache QA', role,
    }});
    f.dbId = row.id;
    await db.profile.create({ data: { userId: row.id } });
    const jar = new Map();
    const client = createServerClient(authUrl, anon, {
      cookies: {
        getAll: () => [...jar].map(([name,value]) => ({ name,value })),
        setAll: values => values.forEach(({name,value}) => value ? jar.set(name,value) : jar.delete(name)),
      },
    });
    f.client = client;
    step = role + ':login';
    const signed = await client.auth.signInWithPassword({ email,password });
    assert.equal(signed.error, null);
    r = await request('/api/user/me?fresh=1', jar);
    assert.equal(r.status, 200); assert.equal(userOf(r.body)?.id, row.id); assert.equal(userOf(r.body)?.role, role);
    pass(role + ' login and authoritative DB role');
    step = role + ':refresh';
    const refreshed = await client.auth.refreshSession();
    assert.equal(refreshed.error, null);
    r = await request('/api/user/me?fresh=1', jar);
    assert.equal(userOf(r.body)?.id, row.id);
    pass(role + ' persisted/refreshed HTTP session');
    step = role + ':protected-route';
    r = await request('/api/jumpa/rooms/aaa-bbbb-ccc', jar);
    assert.equal(r.status, 404);
    pass(role + ' authenticated JUMPA access boundary');
    step = role + ':logout';
    const signedOut = await client.auth.signOut();
    assert.equal(signedOut.error, null);
    r = await request('/api/user/me?fresh=1', jar);
    assert.equal(userOf(r.body), null);
    pass(role + ' logout clears HTTP session');
  }
  assert.notEqual(fixtures[0].dbId, fixtures[1].dbId);
  pass('separate teacher/student identities');
 } catch {
  failed = true;
  console.log(JSON.stringify({ check: step, passed: false, kind: 'HTTP integration; not browser/media' }));
 } finally {
  let cleanupFailed = false;
  for (const f of fixtures.reverse()) {
    try {
      if (f.client) await f.client.auth.signOut();
      if (f.dbId) {
        const row = await db.user.findUnique({ where: { id: f.dbId }, select: { email: true, supabaseId: true } });
        assert.equal(row?.email, f.email); assert.equal(row?.supabaseId, f.authId);
        await db.profile.deleteMany({ where: { userId: f.dbId } });
        await db.user.delete({ where: { id: f.dbId } });
      }
      const removed = await admin.auth.admin.deleteUser(f.authId);
      assert.equal(removed.error, null);
    } catch { cleanupFailed = true; }
  }
  await db.$disconnect();
  console.log(JSON.stringify({ check: 'disposable fixture cleanup', passed: !cleanupFailed }));
  process.exit(failed || cleanupFailed ? 1 : 0);
 }
})();
