import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lanework-next-delta.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/login", "/register"],
        disallow: ["/dashboard", "/api/", "/chat", "/agents", "/team", "/billing", "/monitoring", "/feature-flags"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
