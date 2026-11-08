/// TRANSISIONAL: fallback untuk situs live lama yang belum memuat
/// app/android-app.css. Dilewati otomatis bila situs menandai
/// data-bc-native-styles="1"; hapus setelah rilis web terverifikasi.
/// Presentation-only improvements inside the trusted BahasaCerdas Android WebView.
/// Never changes authentication, cookies, permission checks, or website data.
class MobilePremiumStyle {
  static const javascript = r'''
(() => {
  const host = location.hostname.toLowerCase();
  if (host !== 'bahasacerdas.com' && !host.endsWith('.bahasacerdas.com')) return;
  const html = document.documentElement;
  // Situs yang sudah memuat gaya aplikasi dari source (app/android-app.css)
  // menandai <html data-bc-native-styles="1">: jangan injeksi CSS/DOM lama.
  if (html.getAttribute('data-bc-native-styles') === '1') return;
  html.classList.add('bc-android-app');
  const isLogin = /^\/(?:login|arena\/login)\/?$/.test(location.pathname);
  html.classList.toggle('bc-android-login', isLogin);
  const studentHome = location.pathname === '/murid/beranda';
  const studentArea = /^\/murid(?:\/|$)/.test(location.pathname);
  html.classList.toggle('bc-android-student-subpage', studentArea && !studentHome);
  if (!studentHome) document.getElementById('bc-app-back-to-guru')?.remove();
  if (isLogin) {
    const heading = document.querySelector('h2');
    if (heading && !document.getElementById('bc-android-login-brand')) {
      const brand = document.createElement('div');
      brand.id = 'bc-android-login-brand';
      brand.innerHTML = '<img src="/brand/bc2026-icon.png" alt="Logo BahasaCerdas" width="64" height="64" /><span>BahasaCerdas</span>';
      heading.parentElement?.insertBefore(brand, heading);
    }
    const form = document.querySelector('form:has(#email):has(#password)');
    const card = form && form.closest('.order-1');
    const grid = card && card.parentElement;
    if (grid) {
      grid.classList.add('bc-android-login-grid');
      const hero = grid.querySelector('.order-2');
      if (hero) hero.classList.add('bc-android-login-hero');
    }
    const backToWeb = document.querySelector('a[aria-label="Kembali ke Beranda"]');
    if (backToWeb && backToWeb.parentElement) {
      backToWeb.parentElement.classList.add('bc-android-web-back');
    }
  }
  // The live website may still serve the old Founder switcher until its own
  // deployment. Apply the approved short labels inside the Android app now.
  const fixFounderSwitcher = () => {
    if (!/^\/(?:guru|murid|umum|admin)(?:\/|$)/.test(location.pathname)) return;
    for (const details of document.querySelectorAll('details[data-founder-dashboard-switcher]')) {
      const summary = details.querySelector('summary');
      if (!summary) continue;
      const label = Array.from(summary.querySelectorAll('span')).find(
        el => /Pindah\s+Dasbor\s+Founder|^FOUNDER$/i.test(el.textContent?.trim() || '')
      );
      if (label && label.textContent !== 'FOUNDER') label.textContent = 'FOUNDER';
      summary.setAttribute('aria-label', 'Pilih peran: FOUNDER');
      summary.setAttribute('title', 'Pilih peran: FOUNDER');
      for (const link of details.querySelectorAll('a[href]')) {
        const path = new URL(link.href, location.href).pathname.replace(/\/$/, '');
        const names = {'/umum':'UMUM','/guru/beranda':'GURU','/murid/beranda':'MURID','/admin':'FOUNDER'};
        const name = names[path];
        if (!name) continue;
        const textNodes = Array.from(link.childNodes).filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
        if (textNodes.length) {
          const node = textNodes[textNodes.length - 1];
          if (node.textContent.trim() !== name) node.textContent = name;
        } else {
          const textSpan = Array.from(link.querySelectorAll('span')).find(s => /Dasbor|Panel Admin|^FOUNDER$/.test(s.textContent || ''));
          if (textSpan && textSpan.textContent !== name) textSpan.textContent = name;
        }
      }
    }
  };
  fixFounderSwitcher();
  if (!window.__bcFounderLabelsObserver) {
    let pending = false;
    const observer = new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; fixFounderSwitcher(); });
    });
    observer.observe(document.body, {subtree:true,childList:true,characterData:true});
    window.__bcFounderLabelsObserver = observer;
  }
  const styleId = 'bc-android-premium-style-v2';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      [role="region"][aria-label="Pasang aplikasi"],
      [data-breadcrumb-host="true"],
      nav[aria-label="Breadcrumb"],nav[aria-label="Breadcrumbs"],
      nav[aria-label="breadcrumb"],nav[aria-label="Jejak navigasi"],
      [data-testid="breadcrumbs"],
      [class*="breadcrumb-trail"],[class*="breadcrumbTrail"],
      [class*="BreadcrumbTrail"] { display:none!important; }
      html.bc-android-app button:not([role="switch"]),
      html.bc-android-app a[role="button"] {
        touch-action:manipulation;
        -webkit-tap-highlight-color:transparent;
        transition:transform .16s ease,box-shadow .16s ease;
      }
      html.bc-android-app button:enabled:active,
      html.bc-android-app a[role="button"]:active { transform:scale(.98); }
      html.bc-android-app button:focus-visible,
      html.bc-android-app a:focus-visible {
        outline:3px solid #60a5fa;outline-offset:2px;
      }
      html.bc-android-student-subpage a[href='/guru/beranda'] {display:none!important;}
      /* Live Founder header still uses the old long label until web deploy. */
      @media (max-width:640px) {
        html.bc-android-app details[data-founder-dashboard-switcher] {flex:0 0 auto!important;min-width:0!important;}
        html.bc-android-app details[data-founder-dashboard-switcher] > summary {
          box-sizing:border-box!important;min-width:88px!important;max-width:112px!important;min-height:44px!important;
          padding:7px 9px!important;display:inline-flex!important;
          flex-direction:row!important;align-items:center!important;justify-content:center!important;
          gap:5px!important;white-space:nowrap!important;font-size:11px!important;
          line-height:1.2!important;
        }
        html.bc-android-app details[data-founder-dashboard-switcher] > summary span {
          white-space:nowrap!important;font-size:11px!important;
        }
        html.bc-android-app details[data-founder-dashboard-switcher] > nav {
          min-width:180px!important;max-width:calc(100vw - 24px)!important;
          left:0!important;right:auto!important;
        }
      }
      #bc-android-login-brand {display:flex;align-items:center;justify-content:center;gap:10px;margin:0 auto 12px;color:#4f46e5;font-size:17px;font-weight:800;letter-spacing:-.3px;}
      html.dark #bc-android-login-brand {color:#c4b5fd;}
      #bc-android-login-brand img {width:54px;height:54px;object-fit:contain;border-radius:14px;}
      html.bc-android-login .bc-android-login-grid > .order-1 > div {border-radius:24px!important;background:rgba(255,255,255,.96)!important;}
      html.dark.bc-android-login .bc-android-login-grid > .order-1 > div {background:rgba(15,23,42,.94)!important;}
      html.bc-android-app .jumpa-home section[aria-labelledby="jumpa-rules"] {display:none!important;}
      /* Keep promotional sections hidden across React hydration/re-renders. */
      html.bc-android-login [class*="order-2"][class*="lg:order-1"],
      html.bc-android-login a[aria-label="Kembali ke Beranda"] {
        display:none!important;
      }
      html.bc-android-login [class*="max-w-6xl"][class*="lg:grid-cols-2"] {
        display:block!important;max-width:440px!important;gap:0!important;
      }
      html.bc-android-login [class*="min-h-screen"][class*="gradient-to-br"] {
        min-height:100dvh!important;padding:10px 14px!important;
      }
      /* The native app must not show the full promotional website login. */
      html.bc-android-login .bc-android-login-grid {
        display:block!important;max-width:440px!important;
        width:100%!important;margin:0 auto!important;gap:0!important;
      }
      html.bc-android-login .bc-android-login-hero,
      html.bc-android-login .bc-android-web-back { display:none!important; }
      html.bc-android-login body { overflow-y:auto!important; }
      html.bc-android-login .bc-android-login-grid > .order-1 {
        width:100%!important;max-width:440px!important;margin:0 auto!important;
      }
      html.bc-android-login .bc-android-login-grid > .order-1 > div {
        padding:12px 14px!important;border:0!important;
        box-shadow:none!important;
      }
      html.bc-android-login .bc-android-login-grid .h-16.w-16 {
        width:46px!important;height:46px!important;
      }
      html.bc-android-login .bc-android-login-grid h2 {
        font-size:20px!important;line-height:1.2!important;
      }
      html.bc-android-login .bc-android-login-grid form { row-gap:8px!important; }
      html.bc-android-login .bc-android-login-grid form input {
        min-height:42px!important;padding-top:8px!important;
        padding-bottom:8px!important;
      }
      html.bc-android-login .bc-android-login-grid form button,
      html.bc-android-login .bc-android-login-grid > .order-1 button {
        min-height:42px!important;
      }
      html.bc-android-login .bc-android-login-grid label { margin-bottom:3px!important; }
      html.bc-android-login .bc-android-login-grid > .order-1 > .mt-5.grid.gap-2 { display:none!important; }
      /* Compact the teacher drawer without hiding destinations. */
      #guru-mobile-menu { width:min(50vw,300px)!important;max-width:50vw!important; }
      #guru-mobile-menu nav { padding:8px 6px!important; }
      #guru-mobile-menu nav a,#guru-mobile-menu nav button {
        font-size:13px!important;padding:8px 9px!important;
      }
      #guru-mobile-menu nav .shell-accordion {margin:0 0 4px 13px!important;padding-left:6px!important;gap:0!important;}
      html.bc-android-pip .jumpa-header,
      html.bc-android-pip .jumpa-dock-wrap,
      html.bc-android-pip .jumpa-strip,
      html.bc-android-pip .jumpa-status {display:none!important;}
      html.bc-android-pip .jumpa-tile[data-screen="true"] video {object-fit:contain!important;}
      @media (orientation:landscape) and (max-height:600px) and (pointer:coarse) {
        .jumpa-header {padding:4px 10px!important;margin:0!important;min-height:0!important;}
        .jumpa-mark {width:30px!important;height:30px!important;}
        .jumpa-dock-wrap {padding:3px 8px!important;}
        .jumpa-dock {padding:4px 8px!important;gap:4px!important;}
        .jumpa-dock .jumpa-ctl-label,.jumpa-dock-sep {display:none!important;}
        .jumpa-dock .jumpa-key {width:40px!important;height:40px!important;min-width:40px!important;}
        .jumpa-screen-stage [data-screen="true"] video {object-fit:contain!important;}
      }
      @media (prefers-reduced-motion:reduce) {
        button,a[role="button"] {transition:none!important;}
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }
  // A newly opened teacher drawer should start with groups collapsed.
  // Mark the actual drawer node once: user can freely reopen groups afterward.
  if (!window.__bcAndroidDrawerObserver) {
    const initialized = new WeakSet();
    const collapse = () => {
      const drawer = document.getElementById('guru-mobile-menu');
      if (!drawer || initialized.has(drawer)) return;
      initialized.add(drawer);
      for (const b of drawer.querySelectorAll('button[aria-label]')) {
        if (b.parentElement?.querySelector('.shell-accordion')) b.click();
      }
    };
    const observer = new MutationObserver(collapse);
    observer.observe(document.body, {childList:true,subtree:true});
    window.__bcAndroidDrawerObserver = observer;
    collapse();
  }
})();
''';
}
