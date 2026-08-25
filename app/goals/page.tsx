// app/goals/page.tsx
"use client";

import { useEffect, useState } from "react";
import { CurrencyInput } from "../currency-input";

type Goal = { id: string; name: string; targetAmount: string; savedAmount: string; deadline: string | null };

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [contribInputs, setContribInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/goals");
    if (res.ok) setGoals((await res.json()).goals);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, targetAmount, deadline: deadline || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal membuat target.");
      return;
    }
    setName("");
    setTargetAmount("");
    setDeadline("");
    load();
  };

  const contribute = async (id: string) => {
    const amount = contribInputs[id];
    if (!amount || Number(amount) <= 0) return;
    await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    setContribInputs((s) => ({ ...s, [id]: "" }));
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus target ini?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <main className="page-main">
      <h1 className="page-title">Target Menabung</h1>

      <form onSubmit={submit} className="form-card">
        <input className="field-input" placeholder="Nama target (mis. Dana Darurat)" value={name} onChange={(e) => setName(e.target.value)} required />
        <CurrencyInput placeholder="Target jumlah (Rp)" value={targetAmount} onChange={setTargetAmount} required />
        <input className="field-input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        <button type="submit" className="btn btn-primary">Buat Target</button>
        {error && <p className="form-error">{error}</p>}
      </form>

      {loading ? (
        <p className="empty-note">Memuat...</p>
      ) : goals.length === 0 ? (
        <p className="empty-note">Belum ada target.</p>
      ) : (
        goals.map((g) => {
          const pct = Math.min(100, (Number(g.savedAmount) / Number(g.targetAmount)) * 100);
          return (
            <div key={g.id} className="panel">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{g.name}</strong>
                <button onClick={() => remove(g.id)} className="btn-danger">Hapus</button>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%`, background: "var(--gold)" }} />
              </div>
              <p style={{ fontSize: 13 }} className="mono">
                Rp{Number(g.savedAmount).toLocaleString("id-ID")} / Rp{Number(g.targetAmount).toLocaleString("id-ID")} ({pct.toFixed(0)}%)
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <CurrencyInput
                  placeholder="Tambah tabungan"
                  value={contribInputs[g.id] || ""}
                  onChange={(v) => setContribInputs((s) => ({ ...s, [g.id]: v }))}
                />
                <button onClick={() => contribute(g.id)} className="btn btn-secondary">Tambah</button>
              </div>
            </div>
          );
        })
      )}
    </main>
  );
}
