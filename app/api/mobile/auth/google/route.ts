// app/api/mobile/auth/google/route.ts
// Login Google khusus app mobile — app Flutter dapat "idToken" dari Google
// Sign-In SDK (pakai serverClientId = GOOGLE_CLIENT_ID yang sama dengan Web
// Client di bawah), lalu kita verifikasi idToken itu di server sebelum
// menerbitkan access/refresh token kita sendiri (pola yang sama seperti
// /api/mobile/auth/login).
import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { signAccessToken, issueRefreshToken } from "@/lib/mobile-auth";
import { provisionGoogleUser } from "@/lib/oauth-provision";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request: Request) {
  try {
    const { idToken, deviceInfo } = await request.json();
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Token Google wajib diisi." }, { status: 400 });
    }

    const ip = getClientIp(request.headers);
    if (!checkRateLimit(`mobile-google-ip:${ip}`, 20, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." }, { status: 429 });
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      return NextResponse.json({ error: "Token Google tidak valid." }, { status: 401 });
    }

    if (!payload?.email) {
      return NextResponse.json({ error: "Token Google tidak valid." }, { status: 401 });
    }
    if (!payload.email_verified) {
      return NextResponse.json({ error: "Email Google belum diverifikasi." }, { status: 401 });
    }

    const user = await provisionGoogleUser({ email: payload.email, name: payload.name || "" });

    const accessToken = signAccessToken(user.id);
    const refreshToken = await issueRefreshToken(user.id, typeof deviceInfo === "string" ? deviceInfo.slice(0, 200) : undefined);

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Mobile Google login error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
