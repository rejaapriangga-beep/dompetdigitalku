// app/page.tsx
// Layout Beranda sengaja dibuat semirip mungkin dengan versi Android
// (lib/screens/home_screen.dart di dompetdigitalku-mobile): ringkasan
// anggaran bulan ini di atas, daftar tile statistik (bukan grid kotak
// terpisah), lalu menu berupa ikon berwarna alih-alih kartu teks.
import { auth } from "@/auth";
import Link from "next/link";
import {
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  Target as TargetIcon,
  TrendingUp,
  CreditCard,
  Settings,
  Home as HomeIcon,
  Landmark,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { RecentTransactions } from "./recent-transactions";

const FEATURES = [
  { href: "/dashboard", title: "Transaksi", icon: ArrowLeftRight, color: "var(--primary)" },
  { href: "/accounts", title: "Aset & Utang", icon: Wallet, color: "var(--gold)" },
  { href: "/budgets", title: "Anggaran", icon: PiggyBank, color: "var(--plum)" },
  { href: "/goals", title: "Target Menabung", icon: TargetIcon, color: "var(--teal)" },
  { href: "/investments", title: "Investasi", icon: TrendingUp, color: "var(--sky)" },
  { href: "/debts", title: "Utang & Cicilan", icon: CreditCard, color: "var(--coral)" },
  { href: "/settings/categories", title: "Kategori Transaksi", icon: Settings, color: "var(--success)" },
];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
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
  const membership = await prisma.householdMember.findFirst({
    where: { userId },
    include: { household: true },
  });

  let summary: {
    kas: number;
    totalInvestasi: number;
    totalAsetTetap: number;
    totalUtang: number;
    totalAsetLikuid: number; // kas + investasi
    totalAsetKeseluruhan: number; // kas + investasi + aset tetap
    asetBersihLikuid: number;
    asetBersihTotal: number;
    kasPct: number;
    investasiPct: number;
    asetTetapPct: number;
    rasioLikuidUtang: string;
    rasioTotalUtang: string;
    debtToAssetPct: number | null;
  } | null = null;

  let recentTransactions: {
    id: string;
    type: string;
    amount: string;
    name: string;
    category: string;
    date: string;
    accountName: string | null;
  }[] = [];

  let budgetSummary: { totalBudget: number; totalSpent: number } | null = null;

  if (membership) {
    const [transactions, investments, assets, debts, recent, budgets] = await Promise.all([
      prisma.transaction.findMany({
        where: { householdId: membership.householdId },
        select: { type: true, amount: true, categoryId: true, date: true },
      }),
      prisma.investment.findMany({ where: { householdId: membership.householdId }, select: { currentAmount: true } }),
      prisma.asset.findMany({ where: { householdId: membership.householdId }, select: { currentValue: true } }),
      prisma.debt.findMany({ where: { householdId: membership.householdId }, select: { remainingAmount: true } }),
      prisma.transaction.findMany({
        where: { householdId: membership.householdId },
        orderBy: { date: "desc" },
        take: 10,
        include: { account: { select: { name: true } }, category: { select: { name: true } } },
      }),
      prisma.budget.findMany({ where: { householdId: membership.householdId }, select: { categoryId: true, monthlyAmount: true } }),
    ]);

    // Ringkasan Anggaran Bulan Ini (mirror _BudgetHomeSummary di mobile) —
    // cuma menghitung kategori yang anggarannya sudah diatur (>0).
    const budgetedCatIds = new Set(budgets.filter((b) => Number(b.monthlyAmount) > 0).map((b) => b.categoryId));
    const thisMonth = monthKey(new Date());
    const totalBudget = budgets.reduce((s, b) => s + Math.max(0, Number(b.monthlyAmount)), 0);
    const totalSpent = transactions
      .filter((t) => t.type === "expense" && monthKey(t.date) === thisMonth && budgetedCatIds.has(t.categoryId))
      .reduce((s, t) => s + Number(t.amount), 0);
    budgetSummary = { totalBudget, totalSpent };

    recentTransactions = recent.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount.toString(),
      name: t.name,
      category: t.category.name,
      date: t.date.toISOString(),
      accountName: t.account?.name ?? null,
    }));

    const kas = transactions.reduce((s, t) => s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)), 0);
    const totalInvestasi = investments.reduce((s, i) => s + Number(i.currentAmount), 0);
    const totalAsetTetap = assets.reduce((s, a) => s + Number(a.currentValue), 0);
    const totalUtang = debts.reduce((s, d) => s + Math.max(0, Number(d.remainingAmount)), 0);
    const totalAsetLikuid = Math.max(0, kas) + totalInvestasi;
    const totalAsetKeseluruhan = totalAsetLikuid + totalAsetTetap;

    const formatRatio = (numerator: number, denominator: number) =>
      denominator > 0 ? `${(numerator / denominator).toFixed(2)} : 1` : "Tidak ada utang";

    summary = {
      kas,
      totalInvestasi,
      totalAsetTetap,
      totalUtang,
      totalAsetLikuid,
      totalAsetKeseluruhan,
      asetBersihLikuid: kas + totalInvestasi - totalUtang,
      asetBersihTotal: kas + totalInvestasi + totalAsetTetap - totalUtang,
      kasPct: totalAsetKeseluruhan > 0 ? (Math.max(0, kas) / totalAsetKeseluruhan) * 100 : 0,
      investasiPct: totalAsetKeseluruhan > 0 ? (totalInvestasi / totalAsetKeseluruhan) * 100 : 0,
      asetTetapPct: totalAsetKeseluruhan > 0 ? (totalAsetTetap / totalAsetKeseluruhan) * 100 : 0,
      rasioLikuidUtang: formatRatio(totalAsetLikuid, totalUtang),
      rasioTotalUtang: formatRatio(totalAsetKeseluruhan, totalUtang),
      debtToAssetPct: totalAsetKeseluruhan > 0 ? (totalUtang / totalAsetKeseluruhan) * 100 : totalUtang > 0 ? 100 : null,
    };
  }

  const budgetPct =
    budgetSummary && budgetSummary.totalBudget > 0 ? (budgetSummary.totalSpent / budgetSummary.totalBudget) * 100 : 0;
  const budgetColor =
    !budgetSummary || budgetSummary.totalBudget <= 0
      ? "var(--ink-soft)"
      : budgetPct >= 100
        ? "var(--coral)"
        : budgetPct >= 80
          ? "var(--gold)"
          : "var(--success)";

  return (
    <main className="page-main">
      <h1 className="page-title">Halo, {session.user.name || session.user.email}</h1>
      {membership && (
        <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: -10, marginBottom: 8 }}>
          Rumah tangga: <strong style={{ color: "var(--ink)" }}>{membership.household.name}</strong>
        </p>
      )}

      {/* --- Anggaran Bulan Ini (mirror _BudgetHomeSummary di mobile) --- */}
      {budgetSummary && (
        <Link
          href="/budgets"
          className="tile-row"
          style={{ background: "color-mix(in srgb, var(--plum) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--plum) 25%, var(--border))", marginBottom: 16 }}
        >
          <div className="tile-icon" style={{ background: `color-mix(in srgb, ${budgetColor} 14%, transparent)` }}>
            <PiggyBank size={16} color={budgetColor} />
          </div>
          <div className="tile-body">
            <p className="tile-label">Anggaran Bulan Ini</p>
            {budgetSummary.totalBudget > 0 ? (
              <>
                <p className="tile-value mono">
                  Rp{budgetSummary.totalSpent.toLocaleString("id-ID")} / Rp{budgetSummary.totalBudget.toLocaleString("id-ID")}
                </p>
                <div className="progress-track" style={{ height: 5, margin: "5px 0 0" }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(100, budgetPct)}%`, background: budgetColor }}
                  />
                </div>
              </>
            ) : (
              <p className="tile-value" style={{ color: "var(--ink-soft)" }}>Belum diatur</p>
            )}
          </div>
          {budgetSummary.totalBudget > 0 && (
            <span className="tile-pct" style={{ background: `color-mix(in srgb, ${budgetColor} 14%, transparent)`, color: budgetColor }}>
              {budgetPct.toFixed(0)}%
            </span>
          )}
        </Link>
      )}

      {/* --- Tile statistik (mirror _StatTile di mobile, badge = persentase komposisi aset) --- */}
      {summary && (
        <>
          <div className="tile-list">
            <Link href="/accounts" className="tile-row">
              <div className="tile-icon" style={{ background: "color-mix(in srgb, var(--success) 14%, transparent)" }}>
                <Wallet size={16} color={summary.kas < 0 ? "var(--coral)" : "var(--success)"} />
              </div>
              <div className="tile-body">
                <p className="tile-label">Kas</p>
                <p className={`tile-value mono ${summary.kas < 0 ? "text-expense" : ""}`}>Rp{summary.kas.toLocaleString("id-ID")}</p>
              </div>
              {summary.totalAsetKeseluruhan > 0 && (
                <span className="tile-pct" style={{ background: "color-mix(in srgb, var(--success) 14%, transparent)", color: "var(--success)" }}>
                  {summary.kasPct.toFixed(0)}%
                </span>
              )}
            </Link>
            <Link href="/accounts" className="tile-row">
              <div className="tile-icon" style={{ background: "color-mix(in srgb, var(--sky) 14%, transparent)" }}>
                <HomeIcon size={16} color="var(--sky)" />
              </div>
              <div className="tile-body">
                <p className="tile-label">Aset Tetap</p>
                <p className="tile-value mono">Rp{summary.totalAsetTetap.toLocaleString("id-ID")}</p>
              </div>
              {summary.totalAsetKeseluruhan > 0 && (
                <span className="tile-pct" style={{ background: "color-mix(in srgb, var(--sky) 14%, transparent)", color: "var(--sky)" }}>
                  {summary.asetTetapPct.toFixed(0)}%
                </span>
              )}
            </Link>
            <Link href="/investments" className="tile-row">
              <div className="tile-icon" style={{ background: "color-mix(in srgb, var(--gold) 14%, transparent)" }}>
                <TrendingUp size={16} color="var(--gold)" />
              </div>
              <div className="tile-body">
                <p className="tile-label">Investasi</p>
                <p className="tile-value mono">Rp{summary.totalInvestasi.toLocaleString("id-ID")}</p>
              </div>
              {summary.totalAsetKeseluruhan > 0 && (
                <span className="tile-pct" style={{ background: "color-mix(in srgb, var(--gold) 14%, transparent)", color: "var(--gold)" }}>
                  {summary.investasiPct.toFixed(0)}%
                </span>
              )}
            </Link>
            <Link href="/debts" className="tile-row">
              <div className="tile-icon" style={{ background: "color-mix(in srgb, var(--coral) 14%, transparent)" }}>
                <CreditCard size={16} color="var(--coral)" />
              </div>
              <div className="tile-body">
                <p className="tile-label">Utang Aktif</p>
                <p className="tile-value mono text-expense">Rp{summary.totalUtang.toLocaleString("id-ID")}</p>
              </div>
            </Link>
            <div className="tile-row">
              <div className="tile-icon" style={{ background: "color-mix(in srgb, var(--primary) 14%, transparent)" }}>
                <Landmark size={16} color={summary.asetBersihTotal < 0 ? "var(--coral)" : "var(--primary)"} />
              </div>
              <div className="tile-body">
                <p className="tile-label">Total Aset Bersih</p>
                <p className={`tile-value mono ${summary.asetBersihTotal < 0 ? "text-expense" : ""}`}>
                  Rp{summary.asetBersihTotal.toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>

          <div className="panel">
            <p className="panel-title">Rasio Keuangan</p>
            <div className="item-row">
              <span style={{ fontSize: 13 }}>Kas + Investasi : Utang</span>
              <span className="mono">{summary.rasioLikuidUtang}</span>
            </div>
            <div className="item-row">
              <span style={{ fontSize: 13 }}>Kas + Investasi + Aset Tetap : Utang</span>
              <span className="mono">{summary.rasioTotalUtang}</span>
            </div>
            <div className="item-row">
              <span style={{ fontSize: 13 }}>Rasio Utang terhadap Aset (Debt-to-Asset)</span>
              {summary.debtToAssetPct === null ? (
                <span className="mono text-income">0%</span>
              ) : (
                <span
                  className="mono"
                  style={{ color: summary.debtToAssetPct <= 30 ? "var(--success)" : summary.debtToAssetPct <= 50 ? "var(--gold)" : "var(--coral)" }}
                >
                  {summary.debtToAssetPct.toFixed(1)}%
                </span>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 8 }}>
              Rasio Utang terhadap Aset: &le;30% umumnya dianggap sehat, 30&ndash;50% waspada, &gt;50% berisiko tinggi.
            </p>
          </div>
        </>
      )}

      {membership && <RecentTransactions transactions={recentTransactions} />}

      {/* --- Menu (mirror _TopMenuBar di mobile: ikon berwarna, bukan kartu teks) --- */}
      <p className="panel-title" style={{ marginTop: 4 }}>Menu</p>
      <div className="icon-menu-row">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.href}
              href={f.href}
              className="icon-menu-item"
              style={{ background: `color-mix(in srgb, ${f.color} 14%, transparent)`, color: f.color }}
            >
              <Icon size={22} color={f.color} />
              {f.title}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
