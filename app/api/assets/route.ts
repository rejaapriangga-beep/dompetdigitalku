// app/api/assets/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function GET(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const assets = await prisma.asset.findMany({
    where: { householdId: ctx.householdId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ assets });
}

export async function POST(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  try {
    const body = await request.json();
    const { name, type, currentValue, acquisitionValue, acquisitionDate, note } = body;

    if (!name) return NextResponse.json({ error: "Nama aset wajib diisi." }, { status: 400 });
    if (!type) return NextResponse.json({ error: "Jenis aset wajib diisi." }, { status: 400 });
    if (!currentValue || Number(currentValue) <= 0) {
      return NextResponse.json({ error: "Nilai aset tidak valid." }, { status: 400 });
    }

    const asset = await prisma.asset.create({
      data: {
        householdId: ctx.householdId,
        name,
        type,
        currentValue: Number(currentValue),
        acquisitionValue: acquisitionValue ? Number(acquisitionValue) : null,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
        note: note || null,
      },
    });
    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    console.error("Create asset error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
