// app/api/investments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function GET(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const investments = await prisma.investment.findMany({
    where: { householdId: ctx.householdId },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ investments });
}

export async function POST(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  try {
    const body = await request.json();
    const { name, type, ticker, lots, avgPrice, investedAmount, currentAmount, startDate } = body;

    if (!name) return NextResponse.json({ error: "Nama investasi wajib diisi." }, { status: 400 });
    if (!type) return NextResponse.json({ error: "Jenis investasi wajib diisi." }, { status: 400 });
    if (!investedAmount || Number(investedAmount) <= 0) {
      return NextResponse.json({ error: "Modal awal tidak valid." }, { status: 400 });
    }
    if (currentAmount === undefined || Number(currentAmount) < 0) {
      return NextResponse.json({ error: "Nilai saat ini tidak valid." }, { status: 400 });
    }
    if (!startDate) return NextResponse.json({ error: "Tanggal mulai wajib diisi." }, { status: 400 });

    const investment = await prisma.investment.create({
      data: {
        householdId: ctx.householdId,
        name,
        type,
        ticker: ticker || null,
        lots: lots ? Number(lots) : null,
        avgPrice: avgPrice ? Number(avgPrice) : null,
        investedAmount: Number(investedAmount),
        currentAmount: Number(currentAmount),
        startDate: new Date(startDate),
      },
    });
    return NextResponse.json({ investment }, { status: 201 });
  } catch (err) {
    console.error("Create investment error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
