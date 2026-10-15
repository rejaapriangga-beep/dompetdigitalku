// app/page.tsx
// Beranda — disamakan dengan lib/screens/home_screen.dart di app Android:
// ringkasan anggaran bulan ini, tile statistik (dengan % komposisi aset),
// lalu 3 transaksi terakhir dan tombol + untuk menambah transaksi.
import { auth } from "@/auth";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CreditCard, Home as HomeIcon, Landmark, PieChart, Plus, TrendingUp, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function StatTile({
  href,
  label,
  value,
  color,
  icon: Icon,
  pct,
}: {
  href?: string;
  label: string;
  value: number;
  color: string;
  icon: LucideIcon;
  pct?: number;
}) {
  const body = (
    <>
      <div className="tile-icon" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
        <Icon size={16} color={color} />
      </div>
      <div className="tile-body">
        <p className="tile-label">{label}</p>
        <p className="tile-value mono">{rp(value)}</p>
      </div>
      {pct !== undefined && (
        <span className="tile-pct" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
          {pct.toFixed(0)}%
        </span>
      )}
    </>
  );
  return href ? (
    <Link href={href} className="tile-row">{body}</Link>
  ) : (
    <div className="tile-row">{body}</div>
  );
}

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="page-main">
        <div className="auth-shell" style={{ minHeight: "auto", padding: "60px 0" }}>
          <div className="auth-card" style={{ textAlign: "center", maxWidth: 480 }}>
            <p className="panel-title" style={{ fontSize: 22 }}>DompetDigitalKu</p>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
              <strong>DompetDigitalKu</strong> adalah aplikasi pencatatan keuangan pribadi &amp; keluarga
              (household finance tracker). Catat transaksi harian, kelola akun kas/bank, pantau aset
              tetap dan portofolio investasi, kelola utang &amp; cicilan, atur anggaran bulanan per
              kategori, dan lihat laporan kesehatan keuangan rumah tangga kamu — semua dalam satu
              aplikasi, bisa dipakai bersama anggota keluarga lain.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Link href="/login" className="btn btn-secondary">Masuk</Link>
              <Link href="/register" className="btn btn-primary">Daftar</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const userId = (session.user as { id: string }).id;
  const membership = await prisma.householdMember.findFirst({ where: { userId } });
  if (!membership) {
    return (
      <main className="page-main">
        <p className="empty-note">Akun ini belum tergabung ke rumah tangga mana pun.</p>
      </main>
    );
  }

  const householdId = membership.householdId;
  const [transactions, investments, assets, debts, recent, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { householdId },
      select: { type: true, amount: true, categoryId: true, date: true },
    }),
    prisma.investment.findMany({ where: { householdId }, select: { currentAmount: true } }),
    prisma.asset.findMany({ where: { householdId }, select: { currentValue: true } }),
    prisma.debt.findMany({ where: { householdId }, select: { remainingAmount: true } }),
    prisma.transaction.findMany({
      where: { householdId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 3,
      include: { category: { select: { name: true } } },
    }),
    prisma.budget.findMany({ where: { householdId }, select: { categoryId: true, monthlyAmount: true } }),
  ]);

  // Anggaran Bulan Ini — hanya kategori yang anggarannya diatur (>0).
  const budgetedCatIds = new Set(budgets.filter((b) => Number(b.monthlyAmount) > 0).map((b) => b.categoryId));
  const thisMonth = monthKey(new Date());
  const totalBudget = budgets.reduce((s, b) => s + Math.max(0, Number(b.monthlyAmount)), 0);
  const totalSpent = transactions
    .filter((t) => t.type === "expense" && monthKey(t.date) === thisMonth && budgetedCatIds.has(t.categoryId))
    .reduce((s, t) => s + Number(t.amount), 0);
  const hasBudget = totalBudget > 0;
  const budgetPct = hasBudget ? (totalSpent / totalBudget) * 100 : 0;
  const budgetColor = !hasBudget
    ? "var(--ink-soft)"
    : budgetPct >= 100
      ? "var(--coral)"
      : budgetPct >= 80
        ? "var(--gold)"
        : "var(--success)";

  const kas = transactions.reduce((s, t) => s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)), 0);
  const totalInvestasi = investments.reduce((s, i) => s + Number(i.currentAmount), 0);
  const totalAsetTetap = assets.reduce((s, a) => s + Number(a.currentValue), 0);
  const totalUtang = debts.reduce((s, d) => s + Math.max(0, Number(d.remainingAmount)), 0);
  const totalAset = Math.max(0, kas) + totalInvestasi + totalAsetTetap;
  const pctOf = (v: number) => (totalAset > 0 ? (v / totalAset) * 100 : undefined);
  const asetBersih = kas + totalInvestasi + totalAsetTetap - totalUtang;

  return (
    <main className="page-main">
      <Link
        href="/budgets"
        className="tile-row"
        style={{
          background: "color-mix(in srgb, var(--plum) 8%, var(--surface))",
          borderColor: "color-mix(in srgb, var(--plum) 25%, var(--border))",
          padding: "10px 12px",
        }}
      >
        <div className="tile-icon" style={{ background: `color-mix(in srgb, ${budgetColor} 14%, transparent)` }}>
          <PieChart size={16} color={budgetColor} />
        </div>
        <div className="tile-body">
          <p className="tile-label">Anggaran Bulan Ini</p>
          {hasBudget ? (
            <>
              <p className="tile-value mono" style={{ fontSize: 13 }}>
                {rp(totalSpent)} / {rp(totalBudget)}
              </p>
              <div className="progress-track progress-thin">
                <div className="progress-fill" style={{ width: `${Math.min(100, budgetPct)}%`, background: budgetColor }} />
              </div>
            </>
          ) : (
            <p className="tile-value" style={{ color: "var(--ink-soft)", fontSize: 12.5 }}>Belum diatur</p>
          )}
        </div>
        {hasBudget && (
          <span className="tile-pct" style={{ background: `color-mix(in srgb, ${budgetColor} 14%, transparent)`, color: budgetColor }}>
            {budgetPct.toFixed(0)}%
          </span>
        )}
      </Link>

      <hr className="section-divider" />

      <div className="tile-list">
        <StatTile href="/accounts?tab=kas" label="Kas" value={kas} icon={Wallet}
          color={kas < 0 ? "var(--coral)" : "var(--success)"} pct={pctOf(Math.max(0, kas))} />
        <StatTile href="/accounts?tab=aset" label="Aset Tetap" value={totalAsetTetap} icon={HomeIcon}
          color="var(--sky)" pct={pctOf(totalAsetTetap)} />
        <StatTile href="/accounts?tab=investasi" label="Investasi" value={totalInvestasi} icon={TrendingUp}
          color="var(--gold)" pct={pctOf(totalInvestasi)} />
        <StatTile href="/accounts?tab=utang" label="Utang Aktif" value={totalUtang} icon={CreditCard}
          color="var(--coral)" />
        <StatTile label="Total Aset Bersih" value={asetBersih} icon={Landmark}
          color={asetBersih < 0 ? "var(--coral)" : "var(--primary)"} />
      </div>

      <hr className="section-divider" />

      <div className="section-head">
        <p className="section-head-title">Transaksi Terakhir</p>
        <Link href="/dashboard" className="section-head-link">Lihat semua</Link>
      </div>
      {recent.length === 0 ? (
        <p className="empty-note" style={{ textAlign: "left" }}>Belum ada transaksi.</p>
      ) : (
        recent.map((t) => (
          <div key={t.id} className="recent-row">
            <span className="stamp">{t.category.name}</span>
            <span className="recent-name">{t.name}</span>
            <span className={`mono recent-amount ${t.type === "expense" ? "text-expense" : "text-income"}`}>
              {t.type === "expense" ? "-" : "+"}
              {rp(Number(t.amount))}
            </span>
          </div>
        ))
      )}

      <Link href="/dashboard?tambah=1" className="fab" aria-label="Tambah transaksi" title="Tambah transaksi">
        <Plus size={28} />
      </Link>
    </main>
  );
}
