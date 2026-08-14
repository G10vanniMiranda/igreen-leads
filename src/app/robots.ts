import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  if (process.env.INDEXING_ENABLED !== "true") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacidade"],
      disallow: ["/admin/", "/api/"],
    },
  };
}
