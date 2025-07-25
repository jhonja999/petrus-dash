import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/despacho/", "/api/"],
    },
    sitemap: "https://your-domain.com/sitemap.xml",
  }
}
