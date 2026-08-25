// app/health/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Transaction = { id: string; type: string; amount: string; categoryId: string; date: string };
type BudgetRow = { categoryId: string; monthlyAmount: string };
type Debt = { id: string; remainingAmount: string; monthlyInstallment: string };

type Tier = "good" | "warn" | "bad";
type Indicator = { label: string; score: number | null; detail: string; advice: string };

const TIER_COLOR: Record<Tier, string> = {
  good: "var(--primary)",
  warn: "var(--gold)",
  bad: "var(--coral)",
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}
function tier(score: number): Tier {
  if (score >= 70) return "good";
  if (score >= 40) return "warn";
  return "bad";
}

export default function HealthPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [txRes, budgetRes, debtRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/budgets"),
        fetch("/api/debts"),
      ]);
      if (txRes.ok) setTransactions((await txRes.json()).transactions);
      if (budgetRes.ok) setBudgets((await budgetRes.json()).budgets);
      if (debtRes.ok) setDebts((await debtRes.json()).debts);
      setLoading(false);
    })();
  }, []);

  const indicators = useMemo<Indicator[]>(() => {
    const now = new Date();
    const thisMonthKey = monthKey(now);

    const incomeThisMonth = transactions
      .filter((t) => t.type === "income" && monthKey(new Date(t.date)) === thisMonthKey)
      .reduce((s, t) => s + Number(t.amount), 0);
    const expenseThisMonth = transactions
      .filter((t) => t.type === "expense" && monthKey(new Date(t.date)) === thisMonthKey)
      .reduce((s, t) => s + Number(t.amount), 0);

    const currentBalance = transactions.reduce(
      (s, t) => s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)),
      0
    );

    // a. Rasio menabung bulan ini
    let savings: Indicator;
    if (incomeThisMonth > 0) {
      const ratio = (incomeThisMonth - expenseThisMonth) / incomeThisMonth;
      const score = clamp01(ratio / 0.2) * 100;
      savings = {
        label: "Rasio Menabung",
        score,
        detail: `${(ratio * 100).toFixed(1)}% dari pemasukan bulan ini tersisa sebagai tabungan.`,
        advice:
          score >= 70
            ? "Bagus, kamu berhasil menyisihkan cukup banyak dari pemasukan bulan ini."
            : score >= 40
            ? "Lumayan, coba tingkatkan lagi porsi tabungan menuju 20% dari pemasukan."
            : "Pengeluaran bulan ini mendekati atau melebihi pemasukan — coba tekan pengeluaran non-esensial.",
      };
    } else {
      savings = { label: "Rasio Menabung", score: null, detail: "Belum ada data pemasukan bulan ini.", advice: "" };
    }

    // b. Cakupan dana darurat
    let expenseSum3 = 0;
    for (let i = 0; i < 3; i++) {
      const key = monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1));
      expenseSum3 += transactions
        .filter((t) => t.type === "expense" && monthKey(new Date(t.date)) === key)
        .reduce((s, t) => s + Number(t.amount), 0);
    }
    const avgExpense3 = expenseSum3 / 3;
    let emergency: Indicator;
    if (avgExpense3 > 0) {
      const coverage = currentBalance / avgExpense3;
      const score = clamp01(coverage / 6) * 100;
      emergency = {
        label: "Cakupan Dana Darurat",
        score,
        detail: `Saldo saat ini setara ${coverage.toFixed(1)} bulan pengeluaran rata-rata.`,
        advice:
          score >= 70
            ? "Dana daruratmu sudah cukup kuat, di atas atau mendekati 6 bulan pengeluaran."
            : score >= 40
            ? "Sudah ada bantalan dana darurat, tapi terus tambah menuju 6 bulan pengeluaran."
            : "Dana darurat masih tipis — prioritaskan menabung sebelum pengeluaran yang tidak mendesak.",
      };
    } else {
      emergency = { label: "Cakupan Dana Darurat", score: null, detail: "Belum cukup data pengeluaran 3 bulan terakhir.", advice: "" };
    }

    // c. Kedisiplinan anggaran
    const budgeted = budgets.filter((b) => Number(b.monthlyAmount) > 0);
    let discipline: Indicator;
    if (budgeted.length > 0) {
      const underCount = budgeted.filter((b) => {
        const spent = transactions
          .filter((t) => t.type === "expense" && t.categoryId === b.categoryId && monthKey(new Date(t.date)) === thisMonthKey)
          .reduce((s, t) => s + Number(t.amount), 0);
        return spent < Number(b.monthlyAmount);
      }).length;
      const pct = underCount / budgeted.length;
      const score = pct * 100;
      discipline = {
        label: "Kedisiplinan Anggaran",
        score,
        detail: `${underCount} dari ${budgeted.length} kategori anggaran masih di bawah batas bulan ini.`,
        advice:
          score >= 70
            ? "Sebagian besar anggaran masih terkendali, pertahankan."
            : score >= 40
            ? "Beberapa kategori sudah melewati anggaran — cek kategori mana yang paling boros."
            : "Banyak kategori melewati anggaran bulan ini, coba tinjau ulang batas atau kurangi pengeluaran.",
      };
    } else {
      discipline = { label: "Kedisiplinan Anggaran", score: null, detail: "Belum ada anggaran yang diatur.", advice: "" };
    }

    // d. Rasio utang terhadap pemasukan
    const totalInstallment = debts
      .filter((d) => Number(d.remainingAmount) > 0)
      .reduce((s, d) => s + Number(d.monthlyInstallment), 0);
    let debtRatioInd: Indicator;
    if (incomeThisMonth > 0) {
      const ratio = totalInstallment / incomeThisMonth;
      const score = clamp01(1 - ratio / 0.4) * 100;
      debtRatioInd = {
        label: "Rasio Utang terhadap Pemasukan",
        score,
        detail: `Cicilan aktif setara ${(ratio * 100).toFixed(1)}% dari pemasukan bulan ini.`,
        advice:
          score >= 70
            ? "Beban cicilan masih ringan dibanding pemasukan."
            : score >= 40
            ? "Beban cicilan mulai terasa — hati-hati menambah utang baru."
            : "Beban cicilan cukup berat dibanding pemasukan, pertimbangkan percepatan pelunasan atau restrukturisasi.",
      };
    } else {
      debtRatioInd = { label: "Rasio Utang terhadap Pemasukan", score: null, detail: "Belum ada data pemasukan bulan ini.", advice: "" };
    }

    return [savings, emergency, discipline, debtRatioInd];
  }, [transactions, budgets, debts]);

  const validScores = indicators.filter((i) => i.score !== null).map((i) => i.score as number);
  const overall = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;
  const overallTier = overall !== null ? tier(overall) : null;
  const overallLabel =
    overallTier === "good" ? "Sehat" : overallTier === "warn" ? "Cukup Sehat" : overallTier === "bad" ? "Perlu Perhatian" : "";

  return (
    <main className="page-main">
      <h1 className="page-title">Kesehatan Keuangan</h1>

      {loading ? (
        <p className="empty-note">Memuat...</p>
      ) : (
        <>
          <div className="panel" style={{ textAlign: "center", padding: "28px 20px" }}>
            {overall === null || overallTier === null ? (
              <p className="empty-note">Belum cukup data untuk menghitung skor kesehatan keuangan.</p>
            ) : (
              <>
                <p className="stat-label">Skor Kesehatan Keuangan</p>
                <p className="mono" style={{ fontSize: 48, fontWeight: 600, color: TIER_COLOR[overallTier], lineHeight: 1.1, margin: "4px 0" }}>
                  {overall}
                </p>
                <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>dari 100 · {overallLabel}</p>
                {validScores.length < indicators.length && (
                  <p style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
                    Berdasarkan {validScores.length} dari {indicators.length} indikator (data belum cukup untuk sisanya)
                  </p>
                )}
                <div className="progress-track" style={{ maxWidth: 320, margin: "12px auto 0" }}>
                  <div className="progress-fill" style={{ width: `${overall}%`, background: TIER_COLOR[overallTier] }} />
                </div>
              </>
            )}
          </div>

          {indicators.map((ind) => (
            <div key={ind.label} className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p className="panel-title" style={{ marginBottom: 0 }}>{ind.label}</p>
                {ind.score !== null && (
                  <span className="mono" style={{ fontWeight: 600, color: TIER_COLOR[tier(ind.score)] }}>
                    {Math.round(ind.score)}
                  </span>
                )}
              </div>
              {ind.score !== null && (
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${ind.score}%`, background: TIER_COLOR[tier(ind.score)] }} />
                </div>
              )}
              <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "6px 0 0" }}>{ind.detail}</p>
              {ind.advice && <p style={{ fontSize: 13, marginTop: 4 }}>{ind.advice}</p>}
            </div>
          ))}
        </>
      )}
    </main>
  );
}
