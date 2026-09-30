import type { MetadataRoute } from "next"
export default function manifest(): MetadataRoute.Manifest {
  return { id: "/today", name: "Aditya | My personal Tracker — personal tracker", short_name: "Aditya | My personal Tracker", description: "Your routines, learning and a little daily progress.", start_url: "/today", scope: "/", display: "standalone", background_color: "#f6f7f4", theme_color: "#064e3b", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] }
}
