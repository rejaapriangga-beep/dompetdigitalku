// app/api/transactions/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.transaction.findFirst({ where: { id, householdId: ctx.householdId } });
  if (!existing) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });

  try {
    const body = await request.json();
    const { type, amount, name, categoryId, date, note, accountId, debtId } = body;

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

    const account = await prisma.account.findFirst({ where: { id: accountId, householdId: ctx.householdId } });
    if (!account) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 400 });

    const category = await prisma.category.findFirst({ where: { id: categoryId, householdId: ctx.householdId } });
    if (!category) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 400 });

    let newDebt = null;
    if (debtId) {
      if (type !== "expense") {
        return NextResponse.json({ error: "Pembayaran utang harus berupa pengeluaran." }, { status: 400 });
      }
      newDebt = await prisma.debt.findFirst({ where: { id: debtId, householdId: ctx.householdId } });
      if (!newDebt) return NextResponse.json({ error: "Utang tidak ditemukan." }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Batalkan efek lama ke utang (kalau transaksi ini dulu terkait utang)
      // sebelum menerapkan efek baru — supaya sisa utang tetap konsisten
      // walau kategori/jumlah/kaitan utangnya diubah.
      if (existing.debtId) {
        const oldDebt = await tx.debt.findUnique({ where: { id: existing.debtId } });
        if (oldDebt) {
          const restored = Math.min(Number(oldDebt.totalAmount), Number(oldDebt.remainingAmount) + Number(existing.amount));
          await tx.debt.update({ where: { id: oldDebt.id }, data: { remainingAmount: restored } });
        }
      }

      if (newDebt) {
        // newDebt bisa jadi sama dengan oldDebt (kalau baru saja di-restore di
        // atas) — ambil ulang nilai terbaru sebelum dikurangi.
        const fresh = await tx.debt.findUnique({ where: { id: newDebt.id } });
        if (fresh) {
          const newRemaining = Math.max(0, Number(fresh.remainingAmount) - Number(amount));
          await tx.debt.update({ where: { id: fresh.id }, data: { remainingAmount: newRemaining } });
        }
      }

      return tx.transaction.update({
        where: { id },
        data: {
          type,
          amount: Number(amount),
          name,
          categoryId,
          date: new Date(date),
          note: note || null,
          accountId,
          debtId: debtId || null,
        },
      });
    });

    return NextResponse.json({ transaction: updated });
  } catch (err) {
    console.error("Update transaction error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.transaction.findFirst({ where: { id, householdId: ctx.householdId } });
  if (!existing) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      // Kalau transaksi ini dulu adalah pembayaran utang, kembalikan sisa
      // utangnya supaya datanya tetap konsisten setelah dihapus.
      if (existing.debtId) {
        const debt = await tx.debt.findUnique({ where: { id: existing.debtId } });
        if (debt) {
          const restored = Math.min(Number(debt.totalAmount), Number(debt.remainingAmount) + Number(existing.amount));
          await tx.debt.update({ where: { id: debt.id }, data: { remainingAmount: restored } });
        }
      }
      await tx.transaction.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete transaction error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
