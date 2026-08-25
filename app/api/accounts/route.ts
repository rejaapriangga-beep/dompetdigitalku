// app/api/accounts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function GET(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const [accounts, sums] = await Promise.all([
    prisma.account.findMany({ where: { householdId: ctx.householdId }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { householdId: ctx.householdId },
      _sum: { amount: true },
    }),
  ]);

  const balanceByAccount = new Map<string, number>();
  for (const s of sums) {
    const current = balanceByAccount.get(s.accountId) ?? 0;
    const amount = Number(s._sum.amount ?? 0);
    balanceByAccount.set(s.accountId, current + (s.type === "income" ? amount : -amount));
  }

  const result = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    createdAt: a.createdAt,
    balance: balanceByAccount.get(a.id) ?? 0,
  }));

  return NextResponse.json({ accounts: result });
}

export async function POST(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  try {
    const body = await request.json();
    const { name, type } = body;
    if (!name) return NextResponse.json({ error: "Nama akun wajib diisi." }, { status: 400 });
    if (!type) return NextResponse.json({ error: "Jenis akun wajib diisi." }, { status: 400 });

    const account = await prisma.account.create({
      data: { householdId: ctx.householdId, name, type },
    });
    return NextResponse.json({ account: { ...account, balance: 0 } }, { status: 201 });
  } catch (err) {
    console.error("Create account error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
