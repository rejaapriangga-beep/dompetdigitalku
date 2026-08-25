// app/api/backup/export/route.ts
// Ekspor seluruh data finansial rumah tangga jadi satu JSON portabel — dasar
// untuk fitur Backup (mendukung hak portabilitas data UU PDP Pasal 9, dan
// jaring pengaman sebelum Hapus Akun). Enkripsi dilakukan di sisi klien
// (mobile), bukan di sini — endpoint ini cuma menyediakan datanya lewat
// koneksi HTTPS yang sudah terenkripsi in-transit.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export const BACKUP_FORMAT_VERSION = 1;

export async function GET(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) {
    return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });
  }

  try {
    const { householdId } = ctx;
    const [household, categories, accounts, assets, debts, investments, budgets, goals, transactions] =
      await Promise.all([
        prisma.household.findUnique({ where: { id: householdId } }),
        prisma.category.findMany({ where: { householdId } }),
        prisma.account.findMany({ where: { householdId } }),
        prisma.asset.findMany({ where: { householdId } }),
        prisma.debt.findMany({ where: { householdId } }),
        prisma.investment.findMany({ where: { householdId } }),
        prisma.budget.findMany({ where: { householdId } }),
        prisma.goal.findMany({ where: { householdId } }),
        prisma.transaction.findMany({ where: { householdId } }),
      ]);

    const payload = {
      version: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      householdName: household?.name ?? "",
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type })),
      assets: assets.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currentValue: a.currentValue,
        acquisitionValue: a.acquisitionValue,
        acquisitionDate: a.acquisitionDate,
        note: a.note,
      })),
      debts: debts.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        totalAmount: d.totalAmount,
        remainingAmount: d.remainingAmount,
        monthlyInstallment: d.monthlyInstallment,
        dueDay: d.dueDay,
        startDate: d.startDate,
        note: d.note,
      })),
      investments: investments.map((i) => ({
        id: i.id,
        name: i.name,
        type: i.type,
        ticker: i.ticker,
        lots: i.lots,
        avgPrice: i.avgPrice,
        investedAmount: i.investedAmount,
        currentAmount: i.currentAmount,
        lastPriceUpdatedAt: i.lastPriceUpdatedAt,
        startDate: i.startDate,
      })),
      budgets: budgets.map((b) => ({ categoryId: b.categoryId, monthlyAmount: b.monthlyAmount })),
      goals: goals.map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        savedAmount: g.savedAmount,
        deadline: g.deadline,
      })),
      transactions: transactions.map((t) => ({
        id: t.id,
        accountId: t.accountId,
        debtId: t.debtId,
        type: t.type,
        amount: t.amount,
        name: t.name,
        categoryId: t.categoryId,
        date: t.date,
        note: t.note,
        invoiceUrl: t.invoiceUrl,
      })),
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Backup export error:", err);
    return NextResponse.json({ error: "Gagal membuat backup." }, { status: 500 });
  }
}
