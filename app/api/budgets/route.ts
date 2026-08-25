// app/api/budgets/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function GET(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const budgets = await prisma.budget.findMany({
    where: { householdId: ctx.householdId },
    include: { category: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ budgets });
}

export async function PUT(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  try {
    const body = await request.json();
    const { categoryId, monthlyAmount } = body;
    if (!categoryId) return NextResponse.json({ error: "Kategori wajib dipilih." }, { status: 400 });
    if (monthlyAmount === undefined || Number(monthlyAmount) < 0) {
      return NextResponse.json({ error: "Jumlah anggaran tidak valid." }, { status: 400 });
    }

    const category = await prisma.category.findFirst({ where: { id: categoryId, householdId: ctx.householdId } });
    if (!category) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 400 });
    if (category.type !== "expense") {
      return NextResponse.json({ error: "Anggaran hanya bisa diatur untuk kategori Pengeluaran." }, { status: 400 });
    }

    const budget = await prisma.budget.upsert({
      where: { householdId_categoryId: { householdId: ctx.householdId, categoryId } },
      update: { monthlyAmount: Number(monthlyAmount) },
      create: { householdId: ctx.householdId, categoryId, monthlyAmount: Number(monthlyAmount) },
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ budget });
  } catch (err) {
    console.error("Upsert budget error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
