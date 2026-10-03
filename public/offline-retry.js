// External script: the site's CSP deliberately blocks inline JavaScript.
(() => {
  const button = document.getElementById('retry');
  const status = document.getElementById('status');
  if (!button || !status) return;
  let pendingUrl = null;
  let checking = false;
  let done = false;

  function destination() {
    // A service-worker fallback keeps the originally requested URL in the bar.
    if (window.location.pathname !== '/offline.html') return window.location.href;
    if (pendingUrl) {
      try {
        const url = new URL(pendingUrl, window.location.origin);
        if (url.origin === window.location.origin && url.pathname !== '/offline.html') return url.href;
      } catch { /* Invalid pending URL: return to the home page. */ }
    }
    return '/';
  }

  async function checkNow() {
    if (checking || done) return;
    checking = true;
    button.disabled = true;
    button.textContent = 'Memeriksa koneksi…';
    status.classList.remove('show');
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timer;
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller?.abort();
          reject(new Error('timeout'));
        }, 8000);
      });
      // A static network probe checks connectivity without depending on DB health.
      // sw.js passes no-store requests directly to the network.
      const response = await Promise.race([
        fetch(`/manifest.json?offline-check=${Date.now()}`, { cache: 'no-store', signal: controller?.signal }),
        timeout,
      ]);
      if (!response.ok) throw new Error('not-ready');
      done = true;
      clearInterval(interval);
      window.location.assign(destination());
    } catch {
      checking = false;
      button.disabled = false;
      button.textContent = 'Coba Lagi';
      status.textContent = 'Belum bisa tersambung. Periksa koneksi internetmu, lalu coba lagi.';
      status.classList.add('show');
    } finally {
      clearTimeout(timer);
    }
  }

  button.addEventListener('click', checkNow);
  window.addEventListener('online', checkNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkNow();
  });
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible') void checkNow();
  }, 10000);

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'PENDING_NAV' && event.data.url) pendingUrl = event.data.url;
    });
    navigator.serviceWorker.controller.postMessage('GET_PENDING_NAV');
  }
})();
