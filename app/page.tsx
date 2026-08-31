// app/page.tsx
import { auth } from "@/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RecentTransactions } from "./recent-transactions";

const FEATURES = [
  { href: "/dashboard", title: "Transaksi", sub: "Catat pemasukan & pengeluaran" },
  { href: "/accounts", title: "Aset & Utang", sub: "Kelola kas, aset tetap & utang" },
  { href: "/budgets", title: "Anggaran", sub: "Atur batas pengeluaran bulanan" },
  { href: "/goals", title: "Target Menabung", sub: "Pantau progres tabungan" },
  { href: "/investments", title: "Investasi", sub: "Lacak portofolio" },
  { href: "/debts", title: "Utang & Cicilan", sub: "Kelola pelunasan utang" },
  { href: "/settings/categories", title: "Kategori Transaksi", sub: "Kelola daftar kategori" },
];

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

  if (membership) {
    const [transactions, investments, assets, debts, recent] = await Promise.all([
      prisma.transaction.findMany({ where: { householdId: membership.householdId }, select: { type: true, amount: true } }),
      prisma.investment.findMany({ where: { householdId: membership.householdId }, select: { currentAmount: true } }),
      prisma.asset.findMany({ where: { householdId: membership.householdId }, select: { currentValue: true } }),
      prisma.debt.findMany({ where: { householdId: membership.householdId }, select: { remainingAmount: true } }),
      prisma.transaction.findMany({
        where: { householdId: membership.householdId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { account: { select: { name: true } }, category: { select: { name: true } } },
      }),
    ]);

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

  return (
    <main className="page-main">
      <h1 className="page-title">Halo, {session.user.name || session.user.email}</h1>
      {membership && (
        <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: -10, marginBottom: 8 }}>
          Rumah tangga: <strong style={{ color: "var(--ink)" }}>{membership.household.name}</strong>
        </p>
      )}

      {summary && (
        <>
          <div className="panel" style={{ textAlign: "center", padding: "24px 20px" }}>
            <p className="stat-label">Total Aset Bersih (Kekayaan Bersih)</p>
            <p
              className={`mono ${summary.asetBersihTotal < 0 ? "text-expense" : "text-income"}`}
              style={{ fontSize: 32, fontWeight: 600, margin: "4px 0" }}
            >
              Rp{summary.asetBersihTotal.toLocaleString("id-ID")}
            </p>
            <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>Kas + Investasi + Aset Tetap &minus; Utang aktif</p>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <p className="stat-label">Kas</p>
              <p className={`stat-value mono ${summary.kas < 0 ? "text-expense" : ""}`}>Rp{summary.kas.toLocaleString("id-ID")}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Investasi</p>
              <p className="stat-value mono">Rp{summary.totalInvestasi.toLocaleString("id-ID")}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Aset Tetap</p>
              <p className="stat-value mono">Rp{summary.totalAsetTetap.toLocaleString("id-ID")}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Utang Aktif</p>
              <p className="stat-value mono text-expense">Rp{summary.totalUtang.toLocaleString("id-ID")}</p>
            </div>
          </div>

          {summary.totalAsetKeseluruhan > 0 && (
            <div className="panel">
              <p className="panel-title">Komposisi Aset</p>
              <div className="progress-track" style={{ display: "flex", overflow: "hidden" }}>
                <div style={{ width: `${summary.kasPct}%`, background: "var(--primary)" }} />
                <div style={{ width: `${summary.investasiPct}%`, background: "var(--gold)" }} />
                <div style={{ width: `${summary.asetTetapPct}%`, background: "var(--primary-light)" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--primary)", display: "inline-block" }} />
                    Kas ({summary.kasPct.toFixed(1)}%)
                  </span>
                  <span className="mono">Rp{Math.max(0, summary.kas).toLocaleString("id-ID")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--gold)", display: "inline-block" }} />
                    Investasi ({summary.investasiPct.toFixed(1)}%)
                  </span>
                  <span className="mono">Rp{summary.totalInvestasi.toLocaleString("id-ID")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--primary-light)", display: "inline-block" }} />
                    Aset Tetap ({summary.asetTetapPct.toFixed(1)}%)
                  </span>
                  <span className="mono">Rp{summary.totalAsetTetap.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>
          )}

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
                  style={{ color: summary.debtToAssetPct <= 30 ? "var(--primary)" : summary.debtToAssetPct <= 50 ? "var(--gold)" : "var(--coral)" }}
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

      <p className="panel-title" style={{ marginTop: 4 }}>Menu</p>
      <div className="home-grid">
        {FEATURES.map((f) => (
          <Link key={f.href} href={f.href} className="home-card">
            <p className="home-card-title">{f.title}</p>
            <p className="home-card-sub">{f.sub}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
