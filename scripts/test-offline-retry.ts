import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync('public/offline-retry.js', 'utf8');
const html = readFileSync('public/offline.html', 'utf8');
assert(html.includes('<script src="/offline-retry.js" defer></script>'));
assert(!html.includes('<script>'), 'Offline fallback must work under the nonce CSP.');

function harness(path = '/arena/game/main-bersama', online = true) {
  const callbacks = new Map<string, () => Promise<void>>();
  let message: ((event: { data: { type: string; url: string } }) => void) | undefined;
  let expire: (() => void) | undefined;
  let connected = online;
  let hangs = false;
  let destination = '';
  let calls = 0;
  let intervalCleared = false;
  const button = { disabled: false, textContent: 'Coba Lagi', addEventListener: (name: string, fn: () => Promise<void>) => callbacks.set(name, fn) };
  const classes = new Set<string>();
  const status = { textContent: '', classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) } };
  runInNewContext(script, {
    document: { getElementById: (id: string) => id === 'retry' ? button : status, visibilityState: 'visible', addEventListener: () => {} },
    window: { location: { pathname: path, href: `https://www.bahasacerdas.com${path}`, origin: 'https://www.bahasacerdas.com', assign: (url: string) => { destination = url; } }, addEventListener: (name: string, fn: () => Promise<void>) => callbacks.set(name, fn) },
    navigator: { serviceWorker: { controller: { postMessage: () => {} }, addEventListener: (_name: string, fn: typeof message) => { message = fn; } } },
    fetch: (url: string, options: { cache: string }) => {
      calls++;
      assert.match(url, /^\/manifest\.json\?offline-check=\d+$/); assert.equal(options.cache, 'no-store');
      if (hangs) return new Promise(() => {});
      return connected ? Promise.resolve({ ok: true }) : Promise.reject(new Error('offline'));
    },
    setTimeout: (fn: () => void) => { expire = fn; return 1; }, clearTimeout: () => {},
    setInterval: () => 2, clearInterval: () => { intervalCleared = true; },
    AbortController, URL,
  });
  return { button, status, classes, click: () => callbacks.get('click')!(), online: () => callbacks.get('online')!(), connect: () => { connected = true; }, hang: () => { hangs = true; }, expire: () => expire!(), pending: (url: string) => message!({ data: { type: 'PENDING_NAV', url } }), destination: () => destination, calls: () => calls, cleared: () => intervalCleared };
}

async function main() {
  const recovered = harness('/arena?pin=123456', false);
  await recovered.click();
  assert(!recovered.button.disabled && recovered.classes.has('show'));
  recovered.pending('https://www.bahasacerdas.com/guru');
  recovered.connect(); await recovered.click();
  assert.equal(recovered.destination(), 'https://www.bahasacerdas.com/arena?pin=123456', 'Another tab cannot replace the original navigation.');
  assert(recovered.cleared());

  const pending = harness('/offline.html');
  pending.pending('https://www.bahasacerdas.com/arena/tugas');
  await pending.online(); assert.equal(pending.destination(), 'https://www.bahasacerdas.com/arena/tugas');
  const unsafe = harness('/offline.html'); unsafe.pending('https://example.org/');
  await unsafe.click(); assert.equal(unsafe.destination(), '/');

  const slow = harness(); slow.hang();
  const first = slow.click(); assert(slow.button.disabled);
  await slow.click(); assert.equal(slow.calls(), 1, 'Repeated clicks do not duplicate requests.');
  slow.expire(); await first; assert(!slow.button.disabled && slow.classes.has('show'));

  const handlers = new Map<string, (event: { request: { method: string; url: string; cache: string; mode: string }; respondWith: () => void }) => void>();
  runInNewContext(readFileSync('public/sw.js', 'utf8'), { self: { location: { origin: 'https://www.bahasacerdas.com' }, addEventListener: (name: string, fn: typeof handlers extends Map<string, infer V> ? V : never) => handlers.set(name, fn) }, URL });
  handlers.get('fetch')!({ request: { method: 'GET', url: 'https://www.bahasacerdas.com/manifest.json', cache: 'no-store', mode: 'cors' }, respondWith: () => assert.fail('Connectivity probe must bypass the service-worker cache.') });
  assert(readFileSync('public/sw.js', 'utf8').includes('"/offline-retry.js"'));
  console.log('✅ Offline retry: CSP-compatible script, reconnect, retry after failure, timeout recovery, original URL, duplicate protection and network-only probe.');
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
