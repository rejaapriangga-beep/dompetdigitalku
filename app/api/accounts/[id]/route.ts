// app/api/accounts/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.account.findFirst({ where: { id, householdId: ctx.householdId } });
  if (!existing) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  const txCount = await prisma.transaction.count({ where: { accountId: id } });
  if (txCount > 0) {
    return NextResponse.json(
      { error: `Akun ini masih punya ${txCount} transaksi, tidak bisa dihapus.` },
      { status: 400 }
    );
  }

  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
