// app/api/transactions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function GET(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) {
    return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { householdId: ctx.householdId },
    orderBy: { createdAt: "desc" },
    include: {
      account: { select: { name: true } },
      debt: { select: { name: true } },
      category: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ transactions });
}

export async function POST(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) {
    return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, amount, name, categoryId, date, note, invoiceUrl, accountId, debtId } = body;

    if (!type || !["income", "expense"].includes(type)) {
      return NextResponse.json({ error: "Tipe transaksi harus 'income' atau 'expense'." }, { status: 400 });
    }
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Jumlah harus lebih dari 0." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Nama transaksi wajib diisi." }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: "Kategori wajib dipilih." }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "Tanggal wajib diisi." }, { status: 400 });
    }
    if (!accountId) {
      return NextResponse.json({ error: "Akun kas/bank wajib dipilih." }, { status: 400 });
    }
    // invoiceUrl sebenarnya adalah object key R2 — pastikan memang hasil upload
    // milik household ini, bukan key sembarangan dari client.
    if (invoiceUrl && !String(invoiceUrl).startsWith(`invoices/${ctx.householdId}/`)) {
      return NextResponse.json({ error: "Invoice tidak valid." }, { status: 400 });
    }

    const account = await prisma.account.findFirst({ where: { id: accountId, householdId: ctx.householdId } });
    if (!account) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 400 });

    const category = await prisma.category.findFirst({ where: { id: categoryId, householdId: ctx.householdId } });
    if (!category) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 400 });

    let debt = null;
    if (debtId) {
      if (type !== "expense") {
        return NextResponse.json({ error: "Pembayaran utang harus berupa pengeluaran." }, { status: 400 });
      }
      debt = await prisma.debt.findFirst({ where: { id: debtId, householdId: ctx.householdId } });
      if (!debt) return NextResponse.json({ error: "Utang tidak ditemukan." }, { status: 400 });
    }

    // Kalau transaksi ini pembayaran utang, buat transaksi DAN kurangi sisa utang
    // sekaligus dalam satu transaksi database supaya keduanya selalu konsisten.
    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          householdId: ctx.householdId,
          memberId: ctx.memberId,
          accountId,
          debtId: debtId || null,
          type,
          amount: Number(amount),
          name,
          categoryId,
          date: new Date(date),
          note: note || null,
          invoiceUrl: invoiceUrl || null,
        },
      });

      if (debt) {
        const newRemaining = Math.max(0, Number(debt.remainingAmount) - Number(amount));
        await tx.debt.update({ where: { id: debt.id }, data: { remainingAmount: newRemaining } });
      }

      return created;
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (err) {
    console.error("Create transaction error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
