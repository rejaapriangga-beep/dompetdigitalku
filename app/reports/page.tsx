// app/reports/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Transaction = {
  id: string;
  type: string;
  amount: string;
  name: string;
  category: { id: string; name: string };
  date: string;
  note: string | null;
};
type Debt = { id: string; name: string; type: string; totalAmount: string; remainingAmount: string; monthlyInstallment: string };
type Account = { id: string; balance: number };
type Investment = { id: string; currentAmount: string };
type Asset = { id: string; currentValue: string };

function toLocalDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function firstOfMonth() {
  const d = new Date();
  return toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}
function today() {
  return toLocalDateStr(new Date());
}

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [type, setType] = useState("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [txRes, debtRes, accRes, invRes, assetRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/debts"),
        fetch("/api/accounts"),
        fetch("/api/investments"),
        fetch("/api/assets"),
      ]);
      if (txRes.ok) setTransactions((await txRes.json()).transactions);
      if (debtRes.ok) setDebts((await debtRes.json()).debts);
      if (accRes.ok) setAccounts((await accRes.json()).accounts);
      if (invRes.ok) setInvestments((await invRes.json()).investments);
      if (assetRes.ok) setAssets((await assetRes.json()).assets);
      setLoading(false);
    })();
  }, []);

  const allCategories = useMemo(() => {
    const map = new Map<string, string>();
    transactions.forEach((t) => map.set(t.category.id, t.category.name));
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        const d = t.date.slice(0, 10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        if (type !== "all" && t.type !== type) return false;
        if (selectedCategories.length > 0 && !selectedCategories.includes(t.category.id)) return false;
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [transactions, from, to, type, selectedCategories]);

  const summary = filtered.reduce(
    (acc, t) => {
      if (t.type === "income") acc.income += Number(t.amount);
      else acc.expense += Number(t.amount);
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; income: number; expense: number }>();
    filtered.forEach((t) => {
      const entry = map.get(t.category.id) || { name: t.category.name, income: 0, expense: 0 };
      if (t.type === "income") entry.income += Number(t.amount);
      else entry.expense += Number(t.amount);
      map.set(t.category.id, entry);
    });
    return Array.from(map.entries())
      .map(([categoryId, v]) => ({ categoryId, ...v, net: v.income - v.expense }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [filtered]);

  const activeDebts = debts.filter((d) => Number(d.remainingAmount) > 0);
  const debtTotals = activeDebts.reduce(
    (acc, d) => {
      acc.remaining += Number(d.remainingAmount);
      acc.installment += Number(d.monthlyInstallment);
      return acc;
    },
    { remaining: 0, installment: 0 }
  );

  // Rasio keuangan — posisi terkini (bukan dipengaruhi filter tanggal di atas,
  // karena ini snapshot saldo/aset saat ini, bukan arus transaksi per periode).
  const totalKasSaatIni = accounts.reduce((s, a) => s + a.balance, 0);
  const totalInvestasiSaatIni = investments.reduce((s, i) => s + Number(i.currentAmount), 0);
  const totalAsetTetapSaatIni = assets.reduce((s, a) => s + Number(a.currentValue), 0);
  const totalUtangSaatIni = debtTotals.remaining;
  const totalAsetLikuidSaatIni = Math.max(0, totalKasSaatIni) + totalInvestasiSaatIni;
  const totalAsetKeseluruhanSaatIni = totalAsetLikuidSaatIni + totalAsetTetapSaatIni;

  const formatRatio = (numerator: number, denominator: number) =>
    denominator > 0 ? `${(numerator / denominator).toFixed(2)} : 1` : "Tidak ada utang";

  const debtToAssetPct =
    totalAsetKeseluruhanSaatIni > 0
      ? (totalUtangSaatIni / totalAsetKeseluruhanSaatIni) * 100
      : totalUtangSaatIni > 0
        ? 100
        : null;

  const downloadCsv = () => {
    const header = ["Tanggal", "Tipe", "Kategori", "Jumlah", "Catatan"];
    const rows = filtered.map((t) => [
      t.date.slice(0, 10),
      t.type === "income" ? "Pemasukan" : "Pengeluaran",
      t.category.name,
      t.amount,
      (t.note || "").replace(/"/g, '""'),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="page-main">
      <h1 className="page-title">Laporan</h1>

      <div className="form-card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label className="field-label">Dari</label>
            <input className="field-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label className="field-label">Sampai</label>
            <input className="field-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="field-label">Tipe</label>
          <select className="field-input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">Semua</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
        </div>

        {allCategories.length > 0 && (
          <div>
            <label className="field-label">Kategori</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {allCategories.map((cat) => {
                const active = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className="stamp"
                    style={{
                      cursor: "pointer",
                      background: active ? "var(--primary)" : "transparent",
                      color: active ? "#fff" : "var(--ink-soft)",
                      borderColor: active ? "var(--primary)" : "currentColor",
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
            {selectedCategories.length > 0 && (
              <button type="button" onClick={() => setSelectedCategories([])} className="btn-danger" style={{ marginTop: 6, padding: 0 }}>
                Bersihkan pilihan kategori
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <p className="empty-note">Memuat...</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <p className="stat-label">Pemasukan</p>
              <p className="stat-value mono text-income">Rp{summary.income.toLocaleString("id-ID")}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Pengeluaran</p>
              <p className="stat-value mono text-expense">Rp{summary.expense.toLocaleString("id-ID")}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Saldo Bersih</p>
              <p className="stat-value mono">Rp{(summary.income - summary.expense).toLocaleString("id-ID")}</p>
            </div>
          </div>

          <div className="panel">
            <p className="panel-title">Rincian per Kategori</p>
            {byCategory.length === 0 ? (
              <p className="empty-note">Tidak ada data pada rentang ini.</p>
            ) : (
              byCategory.map((c) => (
                <div key={c.categoryId} className="item-row">
                  <span className="stamp">{c.name}</span>
                  <span className="mono">
                    {c.income > 0 && <span className="text-income">+Rp{c.income.toLocaleString("id-ID")} </span>}
                    {c.expense > 0 && <span className="text-expense">-Rp{c.expense.toLocaleString("id-ID")}</span>}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <p className="panel-title" style={{ marginBottom: 0 }}>Daftar Transaksi ({filtered.length})</p>
              <button type="button" onClick={downloadCsv} className="btn btn-secondary">Unduh CSV</button>
            </div>
            {filtered.length === 0 ? (
              <p className="empty-note">Tidak ada transaksi pada rentang ini.</p>
            ) : (
              filtered.map((t) => (
                <div key={t.id} className="item-row">
                  <span>
                    <span className="stamp">{t.category.name}</span>{" "}
                    <span style={{ marginLeft: 6 }}>{t.name}</span>{" "}
                    <span style={{ fontSize: 11, color: "var(--ink-soft)", marginLeft: 6 }}>
                      {new Date(t.date).toLocaleDateString("id-ID")}
                    </span>
                    {t.note && <span style={{ fontSize: 11.5, color: "var(--ink-soft)", marginLeft: 6 }}>· {t.note}</span>}
                  </span>
                  <span className={`mono ${t.type === "expense" ? "text-expense" : "text-income"}`}>
                    {t.type === "expense" ? "-" : "+"}Rp{Number(t.amount).toLocaleString("id-ID")}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <p className="panel-title">Ringkasan Utang & Cicilan</p>
            {activeDebts.length === 0 ? (
              <p className="empty-note">Tidak ada utang aktif.</p>
            ) : (
              <>
                <div className="stat-grid">
                  <div className="stat-card">
                    <p className="stat-label">Sisa Utang</p>
                    <p className="stat-value mono text-expense">Rp{debtTotals.remaining.toLocaleString("id-ID")}</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Cicilan/Bulan</p>
                    <p className="stat-value mono">Rp{debtTotals.installment.toLocaleString("id-ID")}</p>
                  </div>
                </div>
                {activeDebts.map((d) => (
                  <div key={d.id} className="item-row">
                    <span>
                      <span className="stamp">{d.type}</span> <span style={{ marginLeft: 6 }}>{d.name}</span>
                    </span>
                    <span className="mono">
                      Rp{Number(d.remainingAmount).toLocaleString("id-ID")} · Rp{Number(d.monthlyInstallment).toLocaleString("id-ID")}/bln
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="panel">
            <p className="panel-title">Rasio Keuangan (posisi saat ini)</p>
            <div className="item-row">
              <span style={{ fontSize: 13 }}>Kas + Investasi : Utang</span>
              <span className="mono">{formatRatio(totalAsetLikuidSaatIni, totalUtangSaatIni)}</span>
            </div>
            <div className="item-row">
              <span style={{ fontSize: 13 }}>Kas + Investasi + Aset Tetap : Utang</span>
              <span className="mono">{formatRatio(totalAsetKeseluruhanSaatIni, totalUtangSaatIni)}</span>
            </div>
            <div className="item-row">
              <span style={{ fontSize: 13 }}>Rasio Utang terhadap Aset (Debt-to-Asset)</span>
              {debtToAssetPct === null ? (
                <span className="mono text-income">0%</span>
              ) : (
                <span
                  className="mono"
                  style={{ color: debtToAssetPct <= 30 ? "var(--success)" : debtToAssetPct <= 50 ? "var(--gold)" : "var(--coral)" }}
                >
                  {debtToAssetPct.toFixed(1)}%
                </span>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 8 }}>
              Rasio Utang terhadap Aset: &le;30% umumnya dianggap sehat, 30&ndash;50% waspada, &gt;50% berisiko tinggi.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
