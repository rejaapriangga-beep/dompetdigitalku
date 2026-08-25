// app/api/backup/import/route.ts
// Pulihkan (restore) data rumah tangga dari file backup — MENGGANTI TOTAL
// seluruh data finansial rumah tangga saat ini dengan isi backup (bukan
// digabung). Household/HouseholdMember/User tidak disentuh sama sekali,
// cuma tabel data finansialnya yang dikosongkan lalu diisi ulang.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";
import { BACKUP_FORMAT_VERSION } from "../export/route";

export async function POST(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) {
    return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body?.version !== BACKUP_FORMAT_VERSION) {
      return NextResponse.json(
        { error: "Format file backup tidak dikenali atau tidak kompatibel." },
        { status: 400 }
      );
    }

    const { householdId } = ctx;

    // Semua transaksi yang direstore ditempelkan ke member rumah tangga saat
    // ini (bukan memberId lama dari file backup) — supaya tetap valid meski
    // backup ini dipulihkan ke rumah tangga yang berbeda dari saat dibuat.
    const currentMember = await prisma.householdMember.findFirst({ where: { householdId } });
    if (!currentMember) {
      return NextResponse.json({ error: "Keanggotaan rumah tangga tidak ditemukan." }, { status: 500 });
    }

    const categories = Array.isArray(body.categories) ? body.categories : [];
    const accounts = Array.isArray(body.accounts) ? body.accounts : [];
    const assets = Array.isArray(body.assets) ? body.assets : [];
    const debts = Array.isArray(body.debts) ? body.debts : [];
    const investments = Array.isArray(body.investments) ? body.investments : [];
    const budgets = Array.isArray(body.budgets) ? body.budgets : [];
    const goals = Array.isArray(body.goals) ? body.goals : [];
    const transactions = Array.isArray(body.transactions) ? body.transactions : [];

    await prisma.$transaction(async (tx) => {
      // Kosongkan dulu, urutan menghormati foreign key (anak sebelum induk).
      await tx.transaction.deleteMany({ where: { householdId } });
      await tx.budget.deleteMany({ where: { householdId } });
      await tx.debt.deleteMany({ where: { householdId } });
      await tx.investment.deleteMany({ where: { householdId } });
      await tx.asset.deleteMany({ where: { householdId } });
      await tx.goal.deleteMany({ where: { householdId } });
      await tx.account.deleteMany({ where: { householdId } });
      await tx.category.deleteMany({ where: { householdId } });

      if (categories.length) {
        await tx.category.createMany({
          data: categories.map((c: { id: string; name: string }) => ({
            id: c.id,
            householdId,
            name: c.name,
          })),
        });
      }
      if (accounts.length) {
        await tx.account.createMany({
          data: accounts.map((a: { id: string; name: string; type: string }) => ({
            id: a.id,
            householdId,
            name: a.name,
            type: a.type,
          })),
        });
      }
      if (assets.length) {
        await tx.asset.createMany({
          data: assets.map(
            (a: {
              id: string; name: string; type: string; currentValue: string;
              acquisitionValue: string | null; acquisitionDate: string | null; note: string | null;
            }) => ({
              id: a.id,
              householdId,
              name: a.name,
              type: a.type,
              currentValue: a.currentValue,
              acquisitionValue: a.acquisitionValue,
              acquisitionDate: a.acquisitionDate ? new Date(a.acquisitionDate) : null,
              note: a.note,
            })
          ),
        });
      }
      if (debts.length) {
        await tx.debt.createMany({
          data: debts.map(
            (d: {
              id: string; name: string; type: string; totalAmount: string; remainingAmount: string;
              monthlyInstallment: string; dueDay: number | null; startDate: string; note: string | null;
            }) => ({
              id: d.id,
              householdId,
              name: d.name,
              type: d.type,
              totalAmount: d.totalAmount,
              remainingAmount: d.remainingAmount,
              monthlyInstallment: d.monthlyInstallment,
              dueDay: d.dueDay,
              startDate: new Date(d.startDate),
              note: d.note,
            })
          ),
        });
      }
      if (investments.length) {
        await tx.investment.createMany({
          data: investments.map(
            (i: {
              id: string; name: string; type: string; ticker: string | null; lots: number | null;
              avgPrice: string | null; investedAmount: string; currentAmount: string;
              lastPriceUpdatedAt: string | null; startDate: string;
            }) => ({
              id: i.id,
              householdId,
              name: i.name,
              type: i.type,
              ticker: i.ticker,
              lots: i.lots,
              avgPrice: i.avgPrice,
              investedAmount: i.investedAmount,
              currentAmount: i.currentAmount,
              lastPriceUpdatedAt: i.lastPriceUpdatedAt ? new Date(i.lastPriceUpdatedAt) : null,
              startDate: new Date(i.startDate),
            })
          ),
        });
      }
      if (goals.length) {
        await tx.goal.createMany({
          data: goals.map(
            (g: { id: string; name: string; targetAmount: string; savedAmount: string; deadline: string | null }) => ({
              id: g.id,
              householdId,
              name: g.name,
              targetAmount: g.targetAmount,
              savedAmount: g.savedAmount,
              deadline: g.deadline ? new Date(g.deadline) : null,
            })
          ),
        });
      }
      if (budgets.length) {
        await tx.budget.createMany({
          data: budgets.map((b: { categoryId: string; monthlyAmount: string }) => ({
            householdId,
            categoryId: b.categoryId,
            monthlyAmount: b.monthlyAmount,
          })),
        });
      }
      if (transactions.length) {
        await tx.transaction.createMany({
          data: transactions.map(
            (t: {
              id: string; accountId: string; debtId: string | null; type: string; amount: string;
              name: string; categoryId: string; date: string; note: string | null; invoiceUrl: string | null;
            }) => ({
              id: t.id,
              householdId,
              memberId: currentMember.id,
              accountId: t.accountId,
              debtId: t.debtId,
              type: t.type,
              amount: t.amount,
              name: t.name,
              categoryId: t.categoryId,
              date: new Date(t.date),
              note: t.note,
              invoiceUrl: t.invoiceUrl,
            })
          ),
        });
      }
    });

    return NextResponse.json({
      message: "Data berhasil dipulihkan dari backup.",
      counts: {
        categories: categories.length,
        accounts: accounts.length,
        assets: assets.length,
        debts: debts.length,
        investments: investments.length,
        budgets: budgets.length,
        goals: goals.length,
        transactions: transactions.length,
      },
    });
  } catch (err) {
    console.error("Backup import error:", err);
    return NextResponse.json(
      { error: "Gagal memulihkan backup. Pastikan file backup valid dan tidak rusak." },
      { status: 500 }
    );
  }
}
