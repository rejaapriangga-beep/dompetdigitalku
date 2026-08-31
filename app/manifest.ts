// app/manifest.ts
// Manifest PWA — memungkinkan aplikasi ini di-"Add to Home Screen" di
// Android/iOS dan terasa seperti aplikasi native (ikon sendiri, buka
// full-screen tanpa address bar).
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DompetDigitalKu",
    short_name: "DompetDigitalKu",
    description: "Pengelolaan keuangan keluarga",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0CC0DF",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
