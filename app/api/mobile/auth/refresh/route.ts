// app/api/mobile/auth/refresh/route.ts
// App mobile panggil ini kalau access token-nya sudah kedaluwarsa (15 menit)
// untuk dapat access token baru, tanpa user harus login ulang. Refresh token
// lama otomatis dicabut & diganti baru (rotating) tiap kali dipakai.
import { NextResponse } from "next/server";
import { rotateRefreshToken, signAccessToken } from "@/lib/mobile-auth";

export async function POST(request: Request) {
  try {
    const { refreshToken } = await request.json();
    if (!refreshToken) {
      return NextResponse.json({ error: "refreshToken wajib diisi." }, { status: 400 });
    }

    const result = await rotateRefreshToken(refreshToken);
    if (!result) {
      return NextResponse.json({ error: "Sesi tidak valid atau sudah berakhir, silakan login ulang." }, { status: 401 });
    }

    const accessToken = signAccessToken(result.userId);
    return NextResponse.json({ accessToken, refreshToken: result.newRefreshToken });
  } catch (err) {
    console.error("Mobile refresh error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
