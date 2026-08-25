// app/api/categories/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentHousehold } from "@/lib/current-household";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.category.findFirst({ where: { id, householdId: ctx.householdId } });
  if (!existing) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Nama kategori wajib diisi." }, { status: 400 });

    const dup = await prisma.category.findFirst({
      where: { householdId: ctx.householdId, name, type: existing.type, NOT: { id } },
    });
    if (dup) return NextResponse.json({ error: "Kategori dengan nama itu sudah ada." }, { status: 400 });

    const category = await prisma.category.update({ where: { id }, data: { name } });
    return NextResponse.json({ category });
  } catch (err) {
    console.error("Update category error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.category.findFirst({ where: { id, householdId: ctx.householdId } });
  if (!existing) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });

  const [txCount, budgetCount] = await Promise.all([
    prisma.transaction.count({ where: { categoryId: id } }),
    prisma.budget.count({ where: { categoryId: id } }),
  ]);
  if (txCount > 0 || budgetCount > 0) {
    return NextResponse.json(
      { error: "Kategori masih dipakai oleh transaksi atau anggaran, tidak bisa dihapus." },
      { status: 400 }
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
