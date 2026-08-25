// app/api/account/route.ts
// Hapus akun pengguna (UU PDP Pasal 26 — hak hapus data pribadi). Bekerja
// untuk web (sesi cookie) maupun mobile (Bearer token), lewat helper yang
// sama dipakai route lain.
//
// Aturan saat ini (household selalu 1 anggota di dunia nyata — belum ada
// fitur undang anggota lain): kalau household punya >1 anggota, tolak dulu
// secara aman daripada menghapus data anggota lain tanpa sepengetahuan
// mereka; kasus ini belum pernah bisa terjadi lewat UI manapun sampai
// fitur undang-anggota dibuat.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function DELETE(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }

  try {
    const memberCount = await prisma.householdMember.count({
      where: { householdId: ctx.householdId },
    });

    if (memberCount > 1) {
      return NextResponse.json(
        {
          error:
            "Rumah tangga ini memiliki anggota lain, jadi akun belum bisa dihapus otomatis. Hubungi privacy@dompetdigitalku.my.id untuk bantuan.",
        },
        { status: 409 }
      );
    }

    // Household jadi milik 1 orang ini saja -> aman hapus seluruhnya.
    // Menghapus Household men-cascade semua data keuangan (transaksi, akun,
    // aset, utang, investasi, anggaran, target, kategori) + HouseholdMember-
    // nya sendiri. Setelah itu User dihapus terpisah (men-cascade refresh
    // token miliknya).
    await prisma.$transaction([
      prisma.household.delete({ where: { id: ctx.householdId } }),
      prisma.user.delete({ where: { id: ctx.userId } }),
    ]);

    return NextResponse.json({ message: "Akun dan seluruh data terkait berhasil dihapus." });
  } catch (err) {
    console.error("Delete account error:", err);
    return NextResponse.json({ error: "Gagal menghapus akun. Coba lagi atau hubungi privacy@dompetdigitalku.my.id." }, { status: 500 });
  }
}
