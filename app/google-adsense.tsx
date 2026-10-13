// app/google-adsense.tsx
// Loader script Google AdSense — cuma aktif kalau NEXT_PUBLIC_ADSENSE_CLIENT_ID
// diisi di .env. Dipasang di root layout supaya script-nya dimuat sekali untuk
// seluruh halaman, dibutuhkan sebelum <AdUnit> di ad-unit.tsx bisa menampilkan
// iklan apa pun.
"use client";

import Script from "next/script";

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

export function GoogleAdsense() {
  if (!ADSENSE_CLIENT_ID) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
