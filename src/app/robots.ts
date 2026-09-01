import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/_next/",
          "/dashboard/",
          "/chat/",
          "/agents/",
          "/approvals/",
          "/monitoring/",
          "/feature-flags/",
        ],
      },
    ],
    sitemap: "https://lanework.in/sitemap.xml",
  };
}
