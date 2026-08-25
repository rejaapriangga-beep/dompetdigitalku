// app/api/mobile/auth/login/route.ts
// Login khusus app mobile — pakai email+password yang sama dengan web, tapi
// balasannya token (bukan cookie) karena app native tidak punya cookie jar
// browser.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, issueRefreshToken } from "@/lib/mobile-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const DUMMY_HASH = bcrypt.hashSync("dummy-password-untuk-keamanan-waktu-respons", 12);

export async function POST(request: Request) {
  try {
    const { email, password, deviceInfo } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
    }

    const ip = getClientIp(request.headers);
    if (!checkRateLimit(`mobile-login-email:${email}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." }, { status: 429 });
    }
    if (!checkRateLimit(`mobile-login-ip:${ip}`, 20, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) {
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = await issueRefreshToken(user.id, typeof deviceInfo === "string" ? deviceInfo.slice(0, 200) : undefined);

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Mobile login error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
