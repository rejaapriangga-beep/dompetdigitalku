// app/api/goals/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function GET(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const goals = await prisma.goal.findMany({
    where: { householdId: ctx.householdId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  try {
    const body = await request.json();
    const { name, targetAmount, deadline } = body;
    if (!name) return NextResponse.json({ error: "Nama target wajib diisi." }, { status: 400 });
    if (!targetAmount || Number(targetAmount) <= 0) {
      return NextResponse.json({ error: "Target jumlah tidak valid." }, { status: 400 });
    }

    const goal = await prisma.goal.create({
      data: {
        householdId: ctx.householdId,
        name,
        targetAmount: Number(targetAmount),
        deadline: deadline ? new Date(deadline) : null,
      },
    });
    return NextResponse.json({ goal }, { status: 201 });
  } catch (err) {
    console.error("Create goal error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
