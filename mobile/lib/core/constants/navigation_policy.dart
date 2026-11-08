/// Restricts embedded browsing to trusted BahasaCerdas HTTPS hosts.
/// Third-party OAuth and external links require a separate browser flow.
class NavigationPolicy {
  static bool isTrustedWebUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null || uri.scheme != 'https' || uri.userInfo.isNotEmpty ||
        (uri.hasPort && uri.port != 443)) {
      return false;
    }
    final host = uri.host.toLowerCase();
    return host == 'bahasacerdas.com' ||
        host.endsWith('.bahasacerdas.com');
  }
}
