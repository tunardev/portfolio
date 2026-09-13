import type { MetadataRoute } from "next";
import { BLOG_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: BLOG_DESCRIPTION,
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [{ src: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  };
}
