// app/sw-register.tsx
"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Diamkan saja — kalau gagal daftar SW, aplikasi tetap jalan normal
        // sebagai web biasa, cuma tidak bisa "Add to Home Screen".
      });
    }
  }, []);

  return null;
}
