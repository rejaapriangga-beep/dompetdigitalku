// app/api/assets/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.asset.findFirst({ where: { id, householdId: ctx.householdId } });
  if (!existing) return NextResponse.json({ error: "Aset tidak ditemukan." }, { status: 404 });

  try {
    const body = await request.json();
    const data: { name?: string; currentValue?: number } = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Nama aset wajib diisi." }, { status: 400 });
      data.name = name;
    }
    if (body.currentValue !== undefined) {
      if (!body.currentValue || Number(body.currentValue) <= 0) {
        return NextResponse.json({ error: "Nilai aset tidak valid." }, { status: 400 });
      }
      data.currentValue = Number(body.currentValue);
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
    }

    const asset = await prisma.asset.update({ where: { id }, data });
    return NextResponse.json({ asset });
  } catch (err) {
    console.error("Update asset error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.asset.findFirst({ where: { id, householdId: ctx.householdId } });
  if (!existing) return NextResponse.json({ error: "Aset tidak ditemukan." }, { status: 404 });

  await prisma.asset.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
