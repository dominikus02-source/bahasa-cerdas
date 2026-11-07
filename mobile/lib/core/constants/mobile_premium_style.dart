/// Mobile-only polish injected into trusted BahasaCerdas pages in WebView.
/// The regular website is deliberately unaffected.
class MobilePremiumStyle {
  static const javascript = r'''
(() => {
  if (!location.hostname.endsWith('bahasacerdas.com')) return;
  const id = 'bc-android-premium-style';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    [data-breadcrumb-host="true"],
    nav[aria-label="Breadcrumb"],
    nav[aria-label="Breadcrumbs"],
    nav[aria-label="breadcrumb"],
    nav[aria-label="Jejak navigasi"],
    [data-testid="breadcrumbs"],
    [class*="breadcrumb-trail"],
    [class*="breadcrumbTrail"],
    [class*="BreadcrumbTrail"],
    [class*="breadcrumb"]:not(button):not([role="button"]) {
      display: none !important;
    }
    button:not([role="switch"]):not([role="checkbox"]),
    a[role="button"], input[type="submit"], input[type="button"] {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: background-color .18s ease, border-color .18s ease,
        box-shadow .18s ease, transform .18s ease;
    }
    button:enabled:active, a[role="button"]:active,
    input[type="submit"]:active {
      transform: scale(.975);
    }
    button:focus-visible, a[role="button"]:focus-visible,
    input[type="submit"]:focus-visible {
      outline: 3px solid #60a5fa;
      outline-offset: 3px;
    }
    @media (pointer: coarse) {
      button:not([role="switch"]):not([role="checkbox"]):not(.h-6):not(.h-7),
      a[role="button"] { min-height: 42px; }
    }
    @media (prefers-reduced-motion: reduce) {
      button, a[role="button"], input[type="submit"] { transition: none !important; }
    }
  `;
  (document.head || document.documentElement).appendChild(style);
})();
''';
}
