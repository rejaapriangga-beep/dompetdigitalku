// app/api/goals/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.goal.findFirst({ where: { id, householdId: ctx.householdId } });
  if (!existing) return NextResponse.json({ error: "Target tidak ditemukan." }, { status: 404 });

  try {
    const body = await request.json();
    const { amount } = body;
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Jumlah kontribusi tidak valid." }, { status: 400 });
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: { savedAmount: { increment: Number(amount) } },
    });
    return NextResponse.json({ goal });
  } catch (err) {
    console.error("Contribute goal error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.goal.findFirst({ where: { id, householdId: ctx.householdId } });
  if (!existing) return NextResponse.json({ error: "Target tidak ditemukan." }, { status: 404 });

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
