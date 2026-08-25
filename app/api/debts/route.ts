// app/api/debts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function GET(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const debts = await prisma.debt.findMany({
    where: { householdId: ctx.householdId },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ debts });
}

export async function POST(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  try {
    const body = await request.json();
    const { name, type, totalAmount, remainingAmount, monthlyInstallment, dueDay, startDate, note } = body;

    if (!name) return NextResponse.json({ error: "Nama utang wajib diisi." }, { status: 400 });
    if (!type) return NextResponse.json({ error: "Jenis utang wajib diisi." }, { status: 400 });
    if (!totalAmount || Number(totalAmount) <= 0) {
      return NextResponse.json({ error: "Total pokok tidak valid." }, { status: 400 });
    }
    if (!monthlyInstallment || Number(monthlyInstallment) <= 0) {
      return NextResponse.json({ error: "Cicilan per bulan tidak valid." }, { status: 400 });
    }
    if (!startDate) return NextResponse.json({ error: "Tanggal mulai wajib diisi." }, { status: 400 });

    const debt = await prisma.debt.create({
      data: {
        householdId: ctx.householdId,
        name,
        type,
        totalAmount: Number(totalAmount),
        remainingAmount: remainingAmount !== undefined && remainingAmount !== "" ? Number(remainingAmount) : Number(totalAmount),
        monthlyInstallment: Number(monthlyInstallment),
        dueDay: dueDay ? Number(dueDay) : null,
        startDate: new Date(startDate),
        note: note || null,
      },
    });
    return NextResponse.json({ debt }, { status: 201 });
  } catch (err) {
    console.error("Create debt error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
