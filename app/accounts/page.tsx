// app/accounts/page.tsx
// Aset & Utang — disamakan dengan lib/screens/accounts_assets_screen.dart di
// app Android: 4 tab (Akun Kas, Aset Tetap, Investasi, Utang), tiap tab
// punya kartu total, tombol tambah, dan tombol ubah nama/hapus per baris.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Home as HomeIcon, Pencil, Plus, Trash2, TrendingUp, Wallet } from "lucide-react";
import { CurrencyInput } from "../currency-input";
import { rp, SectionHeader, Sheet, StatCard, TabBar } from "../ui";

const ACCOUNT_TYPES = ["Bank", "Tunai", "E-Wallet", "Lainnya"];
const ASSET_TYPES = ["Properti", "Kendaraan", "Elektronik", "Perhiasan", "Lainnya"];
const INVESTMENT_TYPES = ["Saham", "Reksadana", "Obligasi", "Emas", "Kripto", "Deposito", "Properti", "Lainnya"];

const TABS = [
  ["kas", "Akun Kas"],
  ["aset", "Aset Tetap"],
  ["investasi", "Investasi"],
  ["utang", "Utang"],
] as const;
type Tab = (typeof TABS)[number][0];

type Account = { id: string; name: string; type: string; balance: number };
type Debt = { id: string; name: string; type: string; remainingAmount: string; monthlyInstallment: string };
type Asset = { id: string; name: string; type: string; currentValue: string };
type Investment = { id: string; name: string; type: string; investedAmount: string; currentAmount: string };

type SheetState =
  | { kind: "addAccount" }
  | { kind: "addAsset" }
  | { kind: "addInvestment" }
  | { kind: "assetValue"; id: string; name: string }
  | { kind: "investmentValue"; id: string; name: string }
  | { kind: "rename"; endpoint: string; name: string };

export default function AccountsPage() {
  const [tab, setTab] = useState<Tab>("kas");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [fName, setFName] = useState("");
  const [fType, setFType] = useState("");
  const [fAmount, setFAmount] = useState("");
  const [fAmount2, setFAmount2] = useState("");
  const [fDate, setFDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [accRes, debtRes, assetRes, invRes] = await Promise.all([
      fetch("/api/accounts"),
      fetch("/api/debts"),
      fetch("/api/assets"),
      fetch("/api/investments"),
    ]);
    if (accRes.ok) setAccounts((await accRes.json()).accounts);
    if (debtRes.ok) setDebts((await debtRes.json()).debts);
    if (assetRes.ok) setAssets((await assetRes.json()).assets);
    if (invRes.ok) setInvestments((await invRes.json()).investments);
    setLoading(false);
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal saat mount, bukan derived state
    load();
    // Tile di Beranda membuka tab tertentu lewat ?tab=kas|aset|investasi|utang.
    const t = new URLSearchParams(window.location.search).get("tab");
    if (TABS.some(([key]) => key === t)) setTab(t as Tab);
  }, []);

  const changeTab = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", `/accounts?tab=${t}`);
  };

  const totalKas = accounts.reduce((s, a) => s + a.balance, 0);
  const activeDebts = debts.filter((d) => Number(d.remainingAmount) > 0);
  const totalUtang = activeDebts.reduce((s, d) => s + Number(d.remainingAmount), 0);
  const totalAsetTetap = assets.reduce((s, a) => s + Number(a.currentValue), 0);
  const totalInvested = investments.reduce((s, i) => s + Number(i.investedAmount), 0);
  const totalInvestasi = investments.reduce((s, i) => s + Number(i.currentAmount), 0);
  const investGain = totalInvestasi - totalInvested;
  const investPct = totalInvested > 0 ? (investGain / totalInvested) * 100 : 0;

  const openSheet = (s: SheetState) => {
    setFName(s.kind === "rename" ? s.name : "");
    setFType(
      s.kind === "addAccount" ? ACCOUNT_TYPES[0] : s.kind === "addAsset" ? ASSET_TYPES[0] : INVESTMENT_TYPES[0]
    );
    setFAmount("");
    setFAmount2("");
    setFDate(new Date().toISOString().slice(0, 10));
    setError("");
    setSheet(s);
  };

  const send = async (url: string, method: string, body: unknown) => {
    setSaving(true);
    setError("");
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan.");
      return;
    }
    setSheet(null);
    load();
  };

  const submitSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheet) return;
    switch (sheet.kind) {
      case "addAccount":
        return send("/api/accounts", "POST", { name: fName, type: fType });
      case "addAsset":
        return send("/api/assets", "POST", { name: fName, type: fType, currentValue: fAmount });
      case "addInvestment":
        return send("/api/investments", "POST", {
          name: fName,
          type: fType,
          investedAmount: fAmount,
          currentAmount: fAmount2 || fAmount,
          startDate: fDate,
        });
      case "assetValue":
        return send(`/api/assets/${sheet.id}`, "PATCH", { currentValue: fAmount });
      case "investmentValue":
        return send(`/api/investments/${sheet.id}`, "PATCH", { currentAmount: fAmount });
      case "rename": {
        const name = fName.trim();
        if (!name || name === sheet.name) return setSheet(null);
        return send(sheet.endpoint, "PATCH", { name });
      }
    }
  };

  const remove = async (url: string, label: string) => {
    if (!confirm(`Hapus ${label}?`)) return;
    const res = await fetch(url, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Gagal menghapus.");
      return;
    }
    load();
  };

  const addButton = (s: SheetState) => (
    <button type="button" className="text-btn" onClick={() => openSheet(s)}>
      <Plus size={18} /> Tambah
    </button>
  );

  const rowActions = (renameEndpoint: string, name: string, deleteUrl?: string, deleteLabel?: string) => (
    <>
      <button type="button" className="icon-btn" style={{ color: "var(--primary)" }} aria-label="Ubah nama" title="Ubah"
        onClick={() => openSheet({ kind: "rename", endpoint: renameEndpoint, name })}>
        <Pencil size={18} />
      </button>
      {deleteUrl && (
        <button type="button" className="icon-btn" style={{ color: "var(--coral)" }} aria-label="Hapus" title="Hapus"
          onClick={() => remove(deleteUrl, deleteLabel ?? name)}>
          <Trash2 size={20} />
        </button>
      )}
    </>
  );

  const sheetTitle: Record<SheetState["kind"], string> = {
    addAccount: "Tambah Akun Kas/Bank",
    addAsset: "Tambah Aset Tetap",
    addInvestment: "Tambah Investasi",
    assetValue: "Perbarui Nilai Aset",
    investmentValue: "Perbarui Nilai Investasi",
    rename: "Ubah nama",
  };

  return (
    <main className="page-main page-main-tabs">
      <TabBar tabs={TABS} value={tab} onChange={changeTab} />

      {loading ? (
        <p className="empty-note">Memuat...</p>
      ) : tab === "kas" ? (
        <>
          <StatCard label="Total Kas" value={totalKas} icon={Wallet}
            color={totalKas < 0 ? "var(--coral)" : "var(--success)"} />
          <SectionHeader title="Akun Kas & Bank" action={addButton({ kind: "addAccount" })} />
          {accounts.length === 0 ? (
            <p className="empty-note" style={{ textAlign: "left" }}>Belum ada akun kas/bank.</p>
          ) : (
            accounts.map((a) => (
              <div key={a.id} className="row-card">
                <span className="stamp">{a.type}</span>
                <span className="row-card-title">{a.name}</span>
                <span className={`mono row-card-value ${a.balance < 0 ? "text-expense" : ""}`}>{rp(a.balance)}</span>
                {rowActions(`/api/accounts/${a.id}`, a.name, `/api/accounts/${a.id}`, `akun "${a.name}"`)}
              </div>
            ))
          )}
        </>
      ) : tab === "aset" ? (
        <>
          <StatCard label="Total Aset Tetap" value={totalAsetTetap} icon={HomeIcon} color="var(--sky)" />
          <SectionHeader title="Aset Tetap" action={addButton({ kind: "addAsset" })} />
          {assets.length === 0 ? (
            <p className="empty-note" style={{ textAlign: "left" }}>Belum ada aset tetap.</p>
          ) : (
            assets.map((a) => (
              <div key={a.id} className="item-card">
                <div className="item-card-head">
                  <span className="stamp">{a.type}</span>
                  <span className="row-card-title">{a.name}</span>
                  {rowActions(`/api/assets/${a.id}`, a.name, `/api/assets/${a.id}`, `aset "${a.name}"`)}
                </div>
                <p className="mono item-card-value">{rp(Number(a.currentValue))}</p>
                <button type="button" className="btn-outline btn-outline-sm"
                  onClick={() => openSheet({ kind: "assetValue", id: a.id, name: a.name })}>
                  Perbarui nilai
                </button>
              </div>
            ))
          )}
        </>
      ) : tab === "investasi" ? (
        <>
          <StatCard label="Total Investasi" value={totalInvestasi} icon={TrendingUp} color="var(--gold)" />
          <SectionHeader title="Investasi" action={addButton({ kind: "addInvestment" })} />
          {investments.length === 0 ? (
            <p className="empty-note" style={{ textAlign: "left" }}>Belum ada investasi.</p>
          ) : (
            <>
              <p className="mono" style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 8 }}>
                {rp(totalInvested)} → {rp(totalInvestasi)}{" "}
                <strong className={investGain >= 0 ? "text-income" : "text-expense"}>
                  ({investGain >= 0 ? "+" : ""}{investPct.toFixed(1)}%)
                </strong>
              </p>
              {investments.map((inv) => {
                const g = Number(inv.currentAmount) - Number(inv.investedAmount);
                const p = Number(inv.investedAmount) > 0 ? (g / Number(inv.investedAmount)) * 100 : 0;
                return (
                  <div key={inv.id} className="item-card">
                    <div className="item-card-head">
                      <span className="stamp">{inv.type}</span>
                      <span className="row-card-title">{inv.name}</span>
                      {rowActions(`/api/investments/${inv.id}`, inv.name, `/api/investments/${inv.id}`, `investasi "${inv.name}"`)}
                    </div>
                    <p className={`mono item-card-value ${g >= 0 ? "text-income" : "text-expense"}`} style={{ fontSize: 12.5 }}>
                      {rp(Number(inv.investedAmount))} → {rp(Number(inv.currentAmount))} ({g >= 0 ? "+" : ""}{p.toFixed(1)}%)
                    </p>
                    <button type="button" className="btn-outline btn-outline-sm"
                      onClick={() => openSheet({ kind: "investmentValue", id: inv.id, name: inv.name })}>
                      Perbarui nilai
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </>
      ) : (
        <>
          <StatCard label="Total Utang Aktif" value={totalUtang} icon={CreditCard} color="var(--coral)" />
          <SectionHeader title="Utang & Cicilan"
            action={<Link href="/debts" className="text-btn">Kelola utang</Link>} />
          {activeDebts.length === 0 ? (
            <p className="empty-note" style={{ textAlign: "left" }}>Tidak ada utang aktif.</p>
          ) : (
            activeDebts.map((d) => (
              <div key={d.id} className="row-card">
                <span className="stamp">{d.type}</span>
                <span className="row-card-title">{d.name}</span>
                <span className="mono row-card-value text-expense" style={{ fontSize: 12 }}>
                  {rp(Number(d.remainingAmount))} · {rp(Number(d.monthlyInstallment))}/bln
                </span>
                {rowActions(`/api/debts/${d.id}`, d.name)}
              </div>
            ))
          )}
        </>
      )}

      {sheet && (
        <Sheet title={sheetTitle[sheet.kind]} onClose={() => setSheet(null)} onSubmit={submitSheet}>
          {(sheet.kind === "assetValue" || sheet.kind === "investmentValue") && (
            <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>{sheet.name}</p>
          )}
          {(sheet.kind === "rename" || sheet.kind.startsWith("add")) && (
            <input className="field-input" autoFocus required value={fName} onChange={(e) => setFName(e.target.value)}
              placeholder={
                sheet.kind === "addAccount" ? "Nama akun (mis. BCA, Tunai, GoPay)"
                  : sheet.kind === "addAsset" ? "Nama aset (mis. Rumah, Avanza 2020)"
                    : sheet.kind === "addInvestment" ? "Nama investasi" : "Nama"
              } />
          )}
          {sheet.kind.startsWith("add") && (
            <select className="field-input" value={fType} onChange={(e) => setFType(e.target.value)}>
              {(sheet.kind === "addAccount" ? ACCOUNT_TYPES : sheet.kind === "addAsset" ? ASSET_TYPES : INVESTMENT_TYPES)
                .map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {sheet.kind === "addAsset" && (
            <CurrencyInput placeholder="Estimasi nilai saat ini (Rp)" value={fAmount} onChange={setFAmount} required />
          )}
          {sheet.kind === "addInvestment" && (
            <>
              <CurrencyInput placeholder="Modal awal (Rp)" value={fAmount} onChange={setFAmount} required />
              <CurrencyInput placeholder="Nilai saat ini (kosongkan = sama dengan modal)" value={fAmount2} onChange={setFAmount2} />
              <label className="outlined-field">
                <span>Tanggal mulai</span>
                <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} required />
              </label>
            </>
          )}
          {(sheet.kind === "assetValue" || sheet.kind === "investmentValue") && (
            <CurrencyInput placeholder="Nilai baru (Rp)" value={fAmount} onChange={setFAmount} required />
          )}
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? "Menyimpan…" : sheet.kind.startsWith("add") ? "Tambah" : "Simpan"}
          </button>
        </Sheet>
      )}
    </main>
  );
}
