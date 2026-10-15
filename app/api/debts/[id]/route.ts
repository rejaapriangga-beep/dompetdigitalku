// app/api/debts/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.debt.findFirst({ where: { id, householdId: ctx.householdId } });
  if (!existing) return NextResponse.json({ error: "Utang tidak ditemukan." }, { status: 404 });

  try {
    const body = await request.json();
    const data: { name?: string; remainingAmount?: number } = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Nama utang wajib diisi." }, { status: 400 });
      data.name = name;
    }
    if (body.paymentAmount !== undefined) {
      if (!body.paymentAmount || Number(body.paymentAmount) <= 0) {
        return NextResponse.json({ error: "Jumlah pembayaran tidak valid." }, { status: 400 });
      }
      data.remainingAmount = Math.max(0, Number(existing.remainingAmount) - Number(body.paymentAmount));
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
    }

    const debt = await prisma.debt.update({ where: { id }, data });
    return NextResponse.json({ debt });
  } catch (err) {
    console.error("Pay debt error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.debt.findFirst({ where: { id, householdId: ctx.householdId } });
  if (!existing) return NextResponse.json({ error: "Utang tidak ditemukan." }, { status: 404 });

  await prisma.debt.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
