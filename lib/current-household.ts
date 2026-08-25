// lib/current-household.ts
// Helper yang dipakai berulang di semua API route yang butuh tahu
// household milik user yang sedang login (isolasi data antar keluarga).
//
// Mendukung DUA cara login sekaligus, dari satu API yang sama:
// 1. Web  -> sesi cookie NextAuth (tidak perlu kirim apa pun secara eksplisit)
// 2. Mobile (Flutter) -> header "Authorization: Bearer <access token>"
// Kalau route dipanggil tanpa parameter `request`, cuma mode cookie yang jalan
// (supaya kode lama yang belum diubah tetap berfungsi seperti biasa).

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/mobile-auth";

export async function getCurrentHousehold(request?: Request) {
  let userId: string | null = null;

  const authHeader = request?.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const payload = verifyAccessToken(authHeader.slice(7));
    if (!payload) return null; // token ada tapi tidak valid -> tolak, jangan lanjut coba cookie
    userId = payload.userId;
  } else {
    const session = await auth();
    if (!session?.user) return null;
    userId = (session.user as { id: string }).id;
  }

  const membership = await prisma.householdMember.findFirst({
    where: { userId },
    include: { household: true },
  });
  if (!membership) return null;

  return {
    userId,
    householdId: membership.householdId,
    memberId: membership.id,
    role: membership.role,
    household: membership.household,
  };
}
