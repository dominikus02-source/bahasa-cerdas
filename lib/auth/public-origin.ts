const PRODUCTION_ORIGIN = "https://www.bahasacerdas.com";

/** Standalone servers may expose their bind address in request.url. */
export function resolvePublicAuthOrigin(options: {
  requestUrl: URL;
  siteUrl: string | undefined;
  isProduction: boolean;
}): string {
  if (options.siteUrl) {
    try {
      const configured = new URL(options.siteUrl);
      const allowedProtocol =
        configured.protocol === "https:" ||
        (!options.isProduction && configured.protocol === "http:");
      if (allowedProtocol && !configured.username && !configured.password) {
        return configured.origin;
      }
    } catch {
      // An invalid deployment setting must not leak the server's bind address.
    }
  }

  return options.isProduction ? PRODUCTION_ORIGIN : options.requestUrl.origin;
}
