/// Android-only WebView presentation policy.
////
//// The native shell supplies navigation, so the site's injected breadcrumb host
//// must not be rendered inside its WebView. Do not alter browser behavior.
class AndroidBreadcrumbPolicy {
  static bool appliesTo(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null || uri.scheme != 'https') return false;
    return uri.host.toLowerCase() == 'www.bahasacerdas.com' ||
        uri.host.toLowerCase() == 'bahasacerdas.com';
  }

  /// Removes only the breadcrumb portal inserted by the website.
  ///
  /// The observer also handles Next.js client-side navigations that do not
  /// trigger WebView's onPageFinished callback.
  static const String suppressionScript = r"""
(function () {
  if (window.__bcAndroidBreadcrumbGuard) return;
  window.__bcAndroidBreadcrumbGuard = true;
  const selector = '[data-breadcrumb-host="true"]';
  const style = document.createElement('style');
  style.id = 'bc-android-breadcrumb-suppression';
  style.textContent = selector + '{display:none!important}';
  (document.head || document.documentElement).appendChild(style);

  const removeHosts = () => {
    document.querySelectorAll(selector).forEach((host) => host.remove());
  };
  removeHosts();
  const observer = new MutationObserver(removeHosts);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
""";
}
