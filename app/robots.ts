import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/guru/", "/murid/", "/auth/", "/game/"],
    },
    sitemap: "https://bahasacerdas.site/sitemap.xml",
  };
}
