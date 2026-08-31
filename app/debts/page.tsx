// app/debts/page.tsx
"use client";

import { useEffect, useState } from "react";
import { CurrencyInput } from "../currency-input";

const TYPES = ["KPR", "Kredit Kendaraan", "Kartu Kredit", "Pinjaman Online", "Pinjaman Pribadi", "Lainnya"];
type Debt = { id: string; name: string; type: string; totalAmount: string; remainingAmount: string; monthlyInstallment: string };

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [totalAmount, setTotalAmount] = useState("");
  const [monthlyInstallment, setMonthlyInstallment] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payInputs, setPayInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/debts");
    if (res.ok) setDebts((await res.json()).debts);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const totals = debts.reduce(
    (acc, d) => {
      acc.remaining += Number(d.remainingAmount);
      if (Number(d.remainingAmount) > 0) acc.installment += Number(d.monthlyInstallment);
      return acc;
    },
    { remaining: 0, installment: 0 }
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/debts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, totalAmount, monthlyInstallment, startDate }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menambah utang.");
      return;
    }
    setName("");
    setTotalAmount("");
    setMonthlyInstallment("");
    load();
  };

  const pay = async (id: string) => {
    const amount = payInputs[id];
    if (!amount || Number(amount) <= 0) return;
    await fetch(`/api/debts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentAmount: amount }),
    });
    setPayInputs((s) => ({ ...s, [id]: "" }));
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus utang ini?")) return;
    await fetch(`/api/debts/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <main className="page-main">
      <h1 className="page-title">Utang & Cicilan</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <p className="stat-label">Total Sisa Utang</p>
          <p className="stat-value mono text-expense">Rp{totals.remaining.toLocaleString("id-ID")}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Cicilan/Bulan</p>
          <p className="stat-value mono">Rp{totals.installment.toLocaleString("id-ID")}</p>
        </div>
      </div>

      <form onSubmit={submit} className="form-card">
        <input className="field-input" placeholder="Nama utang (mis. KPR Rumah)" value={name} onChange={(e) => setName(e.target.value)} required />
        <select className="field-input" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <CurrencyInput placeholder="Total pokok utang (Rp)" value={totalAmount} onChange={setTotalAmount} required />
        <CurrencyInput placeholder="Cicilan per bulan (Rp)" value={monthlyInstallment} onChange={setMonthlyInstallment} required />
        <input className="field-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        <button type="submit" className="btn btn-primary">Tambah Utang</button>
        {error && <p className="form-error">{error}</p>}
      </form>

      {loading ? (
        <p className="empty-note">Memuat...</p>
      ) : debts.length === 0 ? (
        <p className="empty-note">Belum ada utang.</p>
      ) : (
        debts.map((d) => {
          const paid = Number(d.totalAmount) - Number(d.remainingAmount);
          const pct = Number(d.totalAmount) > 0 ? (paid / Number(d.totalAmount)) * 100 : 0;
          const isPaidOff = Number(d.remainingAmount) <= 0;
          return (
            <div key={d.id} className="panel">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{d.name}</strong>
                <button onClick={() => remove(d.id)} className="btn-danger">Hapus</button>
              </div>
              <span className="stamp" style={{ marginTop: 4, display: "inline-block" }}>
                {d.type}{isPaidOff && " · Lunas"}
              </span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%`, background: isPaidOff ? "var(--success)" : "var(--gold)" }} />
              </div>
              <p style={{ fontSize: 13 }} className="mono">
                Sisa Rp{Number(d.remainingAmount).toLocaleString("id-ID")} dari Rp{Number(d.totalAmount).toLocaleString("id-ID")} · Rp{Number(d.monthlyInstallment).toLocaleString("id-ID")}/bln
              </p>
              {!isPaidOff && (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <CurrencyInput
                    placeholder="Catat pembayaran"
                    value={payInputs[d.id] || ""}
                    onChange={(v) => setPayInputs((s) => ({ ...s, [d.id]: v }))}
                  />
                  <button onClick={() => pay(d.id)} className="btn btn-secondary">Bayar</button>
                </div>
              )}
            </div>
          );
        })
      )}
    </main>
  );
}
