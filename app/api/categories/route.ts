// app/api/categories/route.ts
// Kelompok kategori transaksi, dikelola user lewat menu Setting — dipakai
// bersama oleh form Transaksi (pilih, bukan ketik bebas) dan Anggaran
// Bulanan. Dipisah 2 tipe (Pemasukan/Pengeluaran) lewat kolom "type".
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

const VALID_TYPES = ["income", "expense"];

export async function GET(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const categories = await prisma.category.findMany({
    where: {
      householdId: ctx.householdId,
      ...(type && VALID_TYPES.includes(type) ? { type } : {}),
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const type = String(body.type || "expense");
    if (!name) return NextResponse.json({ error: "Nama kategori wajib diisi." }, { status: 400 });
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Tipe kategori tidak valid." }, { status: 400 });
    }

    const existing = await prisma.category.findFirst({ where: { householdId: ctx.householdId, name, type } });
    if (existing) return NextResponse.json({ error: "Kategori dengan nama itu sudah ada." }, { status: 400 });

    const category = await prisma.category.create({ data: { householdId: ctx.householdId, name, type } });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    console.error("Create category error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
