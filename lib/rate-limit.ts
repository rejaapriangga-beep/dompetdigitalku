// lib/rate-limit.ts
// Rate limiter sederhana berbasis memori (cukup untuk skala rumah tangga,
// jalan di satu proses Node/PM2). Bukan pengganti WAF, tapi cukup untuk
// mempersulit brute-force otomatis pada login & registrasi.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Bersihkan bucket yang sudah kedaluwarsa setiap beberapa menit supaya
// memori tidak terus bertambah selama proses berjalan lama.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

/**
 * @returns true kalau masih dalam batas (boleh lanjut), false kalau sudah melebihi limit.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}
