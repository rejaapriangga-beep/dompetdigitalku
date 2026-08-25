// app/investments/page.tsx
"use client";

import { useEffect, useState } from "react";
import { CurrencyInput } from "../currency-input";

const TYPES = ["Saham", "Reksadana", "Obligasi", "Emas", "Kripto", "Deposito", "Properti", "Lainnya"];
type Investment = { id: string; name: string; type: string; investedAmount: string; currentAmount: string; startDate: string };

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [updateInputs, setUpdateInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/investments");
    if (res.ok) setInvestments((await res.json()).investments);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const totals = investments.reduce(
    (acc, i) => {
      acc.invested += Number(i.investedAmount);
      acc.current += Number(i.currentAmount);
      return acc;
    },
    { invested: 0, current: 0 }
  );
  const gainTotal = totals.current - totals.invested;
  const pctTotal = totals.invested > 0 ? (gainTotal / totals.invested) * 100 : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/investments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, investedAmount, currentAmount: currentAmount || investedAmount, startDate }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menambah investasi.");
      return;
    }
    setName("");
    setInvestedAmount("");
    setCurrentAmount("");
    load();
  };

  const updateValue = async (id: string) => {
    const value = updateInputs[id];
    if (!value) return;
    await fetch(`/api/investments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentAmount: value }),
    });
    setUpdateInputs((s) => ({ ...s, [id]: "" }));
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus investasi ini?")) return;
    await fetch(`/api/investments/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <main className="page-main">
      <h1 className="page-title">Investasi</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <p className="stat-label">Total Modal</p>
          <p className="stat-value mono">Rp{totals.invested.toLocaleString("id-ID")}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Nilai Saat Ini</p>
          <p className="stat-value mono">Rp{totals.current.toLocaleString("id-ID")}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Untung/Rugi</p>
          <p className={`stat-value mono ${gainTotal >= 0 ? "text-income" : "text-expense"}`}>
            {gainTotal >= 0 ? "+" : ""}{pctTotal.toFixed(1)}%
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="form-card">
        <input className="field-input" placeholder="Nama investasi" value={name} onChange={(e) => setName(e.target.value)} required />
        <select className="field-input" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <CurrencyInput placeholder="Modal awal (Rp)" value={investedAmount} onChange={setInvestedAmount} required />
        <CurrencyInput placeholder="Nilai saat ini (kosongkan = sama dengan modal)" value={currentAmount} onChange={setCurrentAmount} />
        <input className="field-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        <button type="submit" className="btn btn-primary">Tambah Investasi</button>
        {error && <p className="form-error">{error}</p>}
      </form>

      {loading ? (
        <p className="empty-note">Memuat...</p>
      ) : investments.length === 0 ? (
        <p className="empty-note">Belum ada investasi.</p>
      ) : (
        investments.map((inv) => {
          const g = Number(inv.currentAmount) - Number(inv.investedAmount);
          const p = Number(inv.investedAmount) > 0 ? (g / Number(inv.investedAmount)) * 100 : 0;
          return (
            <div key={inv.id} className="panel">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{inv.name}</strong>
                <button onClick={() => remove(inv.id)} className="btn-danger">Hapus</button>
              </div>
              <span className="stamp" style={{ marginTop: 4, display: "inline-block" }}>{inv.type}</span>
              <p style={{ fontSize: 13, marginTop: 8 }} className="mono">
                Rp{Number(inv.investedAmount).toLocaleString("id-ID")} → Rp{Number(inv.currentAmount).toLocaleString("id-ID")}{" "}
                <span className={g >= 0 ? "text-income" : "text-expense"}>({g >= 0 ? "+" : ""}{p.toFixed(1)}%)</span>
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <CurrencyInput
                  placeholder="Perbarui nilai saat ini"
                  value={updateInputs[inv.id] || ""}
                  onChange={(v) => setUpdateInputs((s) => ({ ...s, [inv.id]: v }))}
                />
                <button onClick={() => updateValue(inv.id)} className="btn btn-secondary">Update</button>
              </div>
            </div>
          );
        })
      )}
    </main>
  );
}
