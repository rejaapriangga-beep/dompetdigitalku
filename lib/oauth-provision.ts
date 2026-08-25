// lib/oauth-provision.ts
// Dipakai bersama oleh login Google di web (auth.ts) dan di mobile
// (app/api/mobile/auth/google/route.ts): kalau email sudah terdaftar
// (misalnya dulu daftar manual pakai password), langsung masuk ke akun yang
// sama — tidak bikin akun/rumah tangga baru (sesuai pilihan user: gabungkan
// otomatis). Kalau belum ada, buat User + Household baru persis seperti alur
// /api/register, supaya user Google-baru juga langsung punya akun kas & kategori.
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = ["Makanan", "Transport", "Belanja", "Hiburan", "Tagihan", "Kesehatan", "Pendidikan", "Lainnya"];

export async function provisionGoogleUser({ email, name }: { email: string; name: string }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  // User yang daftar lewat Google tidak pernah pakai password — isi dengan
  // hash acak yang tidak pernah bisa dicocokkan (bukan null, supaya kolom
  // passwordHash tetap NOT NULL tanpa perlu migrasi skema).
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name: name || email.split("@")[0], email, passwordHash },
    });
    const household = await tx.household.create({
      data: { name: `Keluarga ${created.name}` },
    });
    await tx.householdMember.create({
      data: { userId: created.id, householdId: household.id, role: "owner" },
    });
    await tx.account.create({
      data: { householdId: household.id, name: "Kas Utama", type: "Tunai" },
    });
    await tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((catName) => ({ householdId: household.id, name: catName })),
    });
    return created;
  });

  return user;
}
