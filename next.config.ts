import type { NextConfig } from "next";

const securityHeaders = [
  // Paksa browser selalu pakai HTTPS untuk domain ini ke depannya.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Cegah browser menebak-nebak tipe file (mitigasi MIME-sniffing attack).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Cegah situs ini ditaruh di dalam <iframe> situs lain (mitigasi clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Jangan kirim URL halaman ini sebagai referrer ke situs lain.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Matikan akses ke API sensor perangkat yang tidak dipakai aplikasi ini.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Sembunyikan header "X-Powered-By: Next.js" (mengurangi info yang bocor ke penyerang).
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Chunk CSS Turbopack ternyata TIDAK selalu berganti nama file walau
      // isinya berubah (beda dari asumsi normal "immutable" caching untuk
      // aset ber-hash) — jadi CSS lama bisa nyangkut di cache proxy/browser
      // tanpa batas waktu. Paksa revalidasi tiap request supaya perubahan
      // CSS selalu langsung terlihat (masih cepat lewat respons 304 kalau
      // memang belum berubah).
      {
        source: "/_next/static/chunks/:path*.css",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
