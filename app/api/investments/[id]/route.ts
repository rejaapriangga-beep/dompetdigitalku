// app/api/investments/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.investment.findFirst({ where: { id, householdId: ctx.householdId } });
  if (!existing) return NextResponse.json({ error: "Investasi tidak ditemukan." }, { status: 404 });

  try {
    const body = await request.json();
    const data: { name?: string; currentAmount?: number; lastPriceUpdatedAt?: Date } = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Nama investasi wajib diisi." }, { status: 400 });
      data.name = name;
    }
    if (body.currentAmount !== undefined) {
      if (Number(body.currentAmount) < 0) {
        return NextResponse.json({ error: "Nilai saat ini tidak valid." }, { status: 400 });
      }
      data.currentAmount = Number(body.currentAmount);
      data.lastPriceUpdatedAt = new Date();
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
    }

    const investment = await prisma.investment.update({ where: { id }, data });
    return NextResponse.json({ investment });
  } catch (err) {
    console.error("Update investment error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.investment.findFirst({ where: { id, householdId: ctx.householdId } });
  if (!existing) return NextResponse.json({ error: "Investasi tidak ditemukan." }, { status: 404 });

  await prisma.investment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
