// app/ad-unit.tsx
// Satu slot iklan AdSense. Butuh `slot` (ID ad unit, dibuat di dashboard
// AdSense setelah akun approved — beda dari client ID yang levelnya akun).
// Tidak menampilkan apa pun kalau NEXT_PUBLIC_ADSENSE_CLIENT_ID belum diisi,
// supaya aman dipasang di halaman sebelum akun AdSense-nya siap.
"use client";

import { useEffect, useRef } from "react";

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

export function AdUnit({
  slot,
  format = "auto",
  className,
}: {
  slot: string;
  format?: string;
  className?: string;
}) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID || pushed.current) return;
    pushed.current = true;
    try {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle =
        (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || [];
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle.push({});
    } catch {
      // AdSense script belum selesai dimuat / diblokir ad-blocker — biarkan
      // slot kosong, bukan error yang perlu ditampilkan ke user.
    }
  }, []);

  if (!ADSENSE_CLIENT_ID) return null;

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block" }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
