// app/api/mobile/auth/logout/route.ts
// Cabut refresh token device ini (atau semua device kalau allDevices=true).
import { NextResponse } from "next/server";
import { revokeRefreshToken, revokeAllRefreshTokens, verifyAccessToken } from "@/lib/mobile-auth";

export async function POST(request: Request) {
  try {
    const { refreshToken, allDevices } = await request.json();

    if (allDevices) {
      const authHeader = request.headers.get("authorization");
      const payload = authHeader?.startsWith("Bearer ") ? verifyAccessToken(authHeader.slice(7)) : null;
      if (!payload) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
      await revokeAllRefreshTokens(payload.userId);
      return NextResponse.json({ success: true });
    }

    if (refreshToken) await revokeRefreshToken(refreshToken);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mobile logout error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
