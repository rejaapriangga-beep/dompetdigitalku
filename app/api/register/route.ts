// app/api/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, email, password, householdName } = body;

    if (!name || !email || !password || !householdName) {
      return NextResponse.json({ error: "Semua field wajib diisi." }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash },
      });
      const household = await tx.household.create({
        data: { name: householdName },
      });
      await tx.householdMember.create({
        data: { userId: user.id, householdId: household.id, role: "owner" },
      });
      // Setiap rumah tangga wajib punya minimal satu akun kas/bank supaya
      // langsung bisa mencatat transaksi begitu selesai daftar.
      await tx.account.create({
        data: { householdId: household.id, name: "Kas Utama", type: "Tunai" },
      });
      // Kategori transaksi default supaya form Transaksi & Anggaran langsung
      // bisa dipakai tanpa harus setup dulu di menu Setting. Dipisah 2 tipe
      // (Pemasukan/Pengeluaran) supaya form transaksi bisa menyaring
      // dropdown kategori sesuai jenis transaksi yang dipilih.
      const defaultExpenseCategories = [
        "Makanan",
        "Transport",
        "Belanja",
        "Hiburan",
        "Tagihan",
        "Kesehatan",
        "Pendidikan",
        "Lainnya",
      ];
      const defaultIncomeCategories = ["Gaji", "Bonus", "Lainnya"];
      await tx.category.createMany({
        data: [
          ...defaultExpenseCategories.map((name) => ({ householdId: household.id, name, type: "expense" })),
          ...defaultIncomeCategories.map((name) => ({ householdId: household.id, name, type: "income" })),
        ],
      });
      return { user, household };
    });

    return NextResponse.json(
      {
        message: "Registrasi berhasil.",
        userId: result.user.id,
        householdId: result.household.id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
