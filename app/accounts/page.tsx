// app/accounts/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CurrencyInput } from "../currency-input";

const ACCOUNT_TYPES = ["Bank", "Tunai", "E-Wallet", "Lainnya"];
const ASSET_TYPES = ["Properti", "Kendaraan", "Elektronik", "Perhiasan", "Lainnya"];

type Account = { id: string; name: string; type: string; balance: number };
type Debt = { id: string; name: string; type: string; remainingAmount: string; monthlyInstallment: string };
type Asset = { id: string; name: string; type: string; currentValue: string; acquisitionValue: string | null };

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [type, setType] = useState(ACCOUNT_TYPES[0]);
  const [error, setError] = useState("");

  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState(ASSET_TYPES[0]);
  const [assetValue, setAssetValue] = useState("");
  const [assetError, setAssetError] = useState("");
  const [updateInputs, setUpdateInputs] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [accRes, debtRes, assetRes] = await Promise.all([
      fetch("/api/accounts"),
      fetch("/api/debts"),
      fetch("/api/assets"),
    ]);
    if (accRes.ok) setAccounts((await accRes.json()).accounts);
    if (debtRes.ok) setDebts((await debtRes.json()).debts);
    if (assetRes.ok) setAssets((await assetRes.json()).assets);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const totalKas = accounts.reduce((s, a) => s + a.balance, 0);
  const activeDebts = debts.filter((d) => Number(d.remainingAmount) > 0);
  const totalUtang = activeDebts.reduce((s, d) => s + Number(d.remainingAmount), 0);
  const totalAsetTetap = assets.reduce((s, a) => s + Number(a.currentValue), 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menambah akun.");
      return;
    }
    setName("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus akun ini?")) return;
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Gagal menghapus akun.");
      return;
    }
    load();
  };

  const submitAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssetError("");
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: assetName, type: assetType, currentValue: assetValue }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAssetError(data.error || "Gagal menambah aset.");
      return;
    }
    setAssetName("");
    setAssetValue("");
    load();
  };

  const updateAssetValue = async (id: string) => {
    const value = updateInputs[id];
    if (!value) return;
    await fetch(`/api/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentValue: value }),
    });
    setUpdateInputs((s) => ({ ...s, [id]: "" }));
    load();
  };

  const removeAsset = async (id: string) => {
    if (!confirm("Hapus aset ini?")) return;
    const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Gagal menghapus aset.");
      return;
    }
    load();
  };

  return (
    <main className="page-main">
      <h1 className="page-title">Aset & Utang</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <p className="stat-label">Total Kas</p>
          <p className={`stat-value mono ${totalKas < 0 ? "text-expense" : "text-income"}`}>Rp{totalKas.toLocaleString("id-ID")}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Aset Tetap</p>
          <p className="stat-value mono">Rp{totalAsetTetap.toLocaleString("id-ID")}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Utang Aktif</p>
          <p className="stat-value mono text-expense">Rp{totalUtang.toLocaleString("id-ID")}</p>
        </div>
      </div>

      <p className="panel-title">Akun Kas & Bank</p>
      <form onSubmit={submit} className="form-card">
        <input className="field-input" placeholder="Nama akun (mis. BCA, Tunai, GoPay)" value={name} onChange={(e) => setName(e.target.value)} required />
        <select className="field-input" value={type} onChange={(e) => setType(e.target.value)}>
          {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="submit" className="btn btn-primary">Tambah Akun</button>
        {error && <p className="form-error">{error}</p>}
      </form>

      <div className="panel">
        {loading ? (
          <p className="empty-note">Memuat...</p>
        ) : accounts.length === 0 ? (
          <p className="empty-note">Belum ada akun kas/bank.</p>
        ) : (
          accounts.map((a) => (
            <div key={a.id} className="item-row">
              <span>
                <span className="stamp">{a.type}</span> <span style={{ marginLeft: 6 }}>{a.name}</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`mono ${a.balance < 0 ? "text-expense" : ""}`}>Rp{a.balance.toLocaleString("id-ID")}</span>
                <button onClick={() => remove(a.id)} className="btn-danger">Hapus</button>
              </span>
            </div>
          ))
        )}
      </div>

      <p className="panel-title">Aset Tetap</p>
      <form onSubmit={submitAsset} className="form-card">
        <input className="field-input" placeholder="Nama aset (mis. Rumah Cluster ABC, Avanza 2020)" value={assetName} onChange={(e) => setAssetName(e.target.value)} required />
        <select className="field-input" value={assetType} onChange={(e) => setAssetType(e.target.value)}>
          {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <CurrencyInput placeholder="Estimasi nilai saat ini (Rp)" value={assetValue} onChange={setAssetValue} required />
        <button type="submit" className="btn btn-primary">Tambah Aset</button>
        {assetError && <p className="form-error">{assetError}</p>}
      </form>

      <div className="panel">
        {loading ? (
          <p className="empty-note">Memuat...</p>
        ) : assets.length === 0 ? (
          <p className="empty-note">Belum ada aset tetap.</p>
        ) : (
          assets.map((a) => (
            <div key={a.id} className="panel" style={{ marginBottom: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  <span className="stamp">{a.type}</span> <span style={{ marginLeft: 6 }}>{a.name}</span>
                </span>
                <button onClick={() => removeAsset(a.id)} className="btn-danger">Hapus</button>
              </div>
              <p className="mono" style={{ fontSize: 13, marginTop: 6 }}>Rp{Number(a.currentValue).toLocaleString("id-ID")}</p>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <CurrencyInput
                  placeholder="Perbarui estimasi nilai"
                  value={updateInputs[a.id] || ""}
                  onChange={(v) => setUpdateInputs((s) => ({ ...s, [a.id]: v }))}
                />
                <button onClick={() => updateAssetValue(a.id)} className="btn btn-secondary">Update</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p className="panel-title" style={{ marginBottom: 0 }}>Utang & Cicilan</p>
        <Link href="/debts" className="link-plain" style={{ fontSize: 12.5 }}>Kelola utang →</Link>
      </div>
      <div className="panel">
        {loading ? (
          <p className="empty-note">Memuat...</p>
        ) : activeDebts.length === 0 ? (
          <p className="empty-note">Tidak ada utang aktif.</p>
        ) : (
          activeDebts.map((d) => (
            <div key={d.id} className="item-row">
              <span>
                <span className="stamp">{d.type}</span> <span style={{ marginLeft: 6 }}>{d.name}</span>
              </span>
              <span className="mono text-expense">
                Rp{Number(d.remainingAmount).toLocaleString("id-ID")} · Rp{Number(d.monthlyInstallment).toLocaleString("id-ID")}/bln
              </span>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
