// lib/mobile-auth.ts
// Autentikasi berbasis token (JWT) khusus untuk app mobile (Flutter) —
// terpisah dari sesi cookie NextAuth yang dipakai versi web, tapi berbagi
// database & user yang sama persis.
//
// Pola: access token JWT berumur pendek (tidak disimpan di DB, cukup
// diverifikasi tanda tangannya) + refresh token acak panjang yang DI-HASH
// sebelum disimpan (mirip cara simpan password) supaya kalau database bocor,
// refresh token tidak langsung bisa dipakai orang lain. Refresh token
// **rotating**: setiap dipakai, langsung dicabut & diganti yang baru.
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "./prisma";

const ACCESS_TOKEN_SECRET = process.env.AUTH_SECRET!;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 30;

export type AccessTokenPayload = { userId: string };

export function signAccessToken(userId: string): string {
  return jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    if (typeof decoded === "object" && decoded && "userId" in decoded) {
      return { userId: String((decoded as { userId: unknown }).userId) };
    }
    return null;
  } catch {
    return null;
  }
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueRefreshToken(userId: string, deviceInfo?: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString("base64url");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt, deviceInfo: deviceInfo || null } });
  return raw;
}

/** Verifikasi + putar (rotate) refresh token: yang lama dicabut, dapat yang baru. */
export async function rotateRefreshToken(rawToken: string): Promise<{ userId: string; newRefreshToken: string } | null> {
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) return null;

  await prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
  const newRefreshToken = await issueRefreshToken(existing.userId, existing.deviceInfo ?? undefined);
  return { userId: existing.userId, newRefreshToken };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revokedAt: new Date() } });
}

/** Dipakai untuk "logout semua device". */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}
