// app/debts/page.tsx
// Utang & Cicilan — disamakan dengan lib/screens/debts_screen.dart di app
// Android: 2 kartu total, daftar utang, tambah lewat tombol +, catat
// pembayaran & ubah nama lewat bottom sheet.
"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { CurrencyInput } from "../currency-input";
import { rp, Sheet, StatCard } from "../ui";

const TYPES = ["KPR", "Kredit Kendaraan", "Kartu Kredit", "Pinjaman Online", "Pinjaman Pribadi", "Lainnya"];
type Debt = { id: string; name: string; type: string; totalAmount: string; remainingAmount: string; monthlyInstallment: string };
type SheetState = { kind: "add" } | { kind: "pay"; debt: Debt } | { kind: "rename"; debt: Debt };

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [totalAmount, setTotalAmount] = useState("");
  const [monthlyInstallment, setMonthlyInstallment] = useState("");
  const [startDate, setStartDate] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/debts");
    if (res.ok) setDebts((await res.json()).debts);
    setLoading(false);
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal saat mount, bukan derived state
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

  const openSheet = (s: SheetState) => {
    setError("");
    setName(s.kind === "rename" ? s.debt.name : "");
    setType(TYPES[0]);
    setTotalAmount("");
    setMonthlyInstallment("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setPayAmount("");
    setSheet(s);
  };

  const submitSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheet) return;
    setError("");
    let url = "/api/debts";
    let method = "POST";
    let body: Record<string, unknown>;
    if (sheet.kind === "add") {
      body = { name, type, totalAmount, monthlyInstallment, startDate };
    } else if (sheet.kind === "pay") {
      if (!payAmount || Number(payAmount) <= 0) return setError("Jumlah pembayaran tidak valid.");
      url = `/api/debts/${sheet.debt.id}`;
      method = "PATCH";
      body = { paymentAmount: payAmount };
    } else {
      url = `/api/debts/${sheet.debt.id}`;
      method = "PATCH";
      body = { name };
    }
    setSaving(true);
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan.");
      return;
    }
    setSheet(null);
    load();
  };

  const remove = async (d: Debt) => {
    if (!confirm(`Hapus utang "${d.name}"?`)) return;
    const res = await fetch(`/api/debts/${d.id}`, { method: "DELETE" });
    if (!res.ok) alert("Gagal menghapus utang.");
    load();
  };

  const sheetTitle = !sheet ? "" : sheet.kind === "add" ? "Tambah Utang"
    : sheet.kind === "pay" ? `Catat pembayaran "${sheet.debt.name}"` : "Ubah nama";

  return (
    <main className="page-main">
      <div className="stat-big-row">
        <StatCard label="Total Sisa Utang" value={totals.remaining} icon={CreditCard} color="var(--coral)" />
        <StatCard label="Cicilan/Bulan" value={totals.installment} icon={CalendarClock} color="var(--gold)" />
      </div>

      {loading ? (
        <p className="empty-note">Memuat...</p>
      ) : debts.length === 0 ? (
        <p className="empty-note">Belum ada utang.</p>
      ) : (
        debts.map((d) => {
          const paid = Number(d.totalAmount) - Number(d.remainingAmount);
          const pct = Number(d.totalAmount) > 0 ? Math.min(100, Math.max(0, (paid / Number(d.totalAmount)) * 100)) : 0;
          const isPaidOff = Number(d.remainingAmount) <= 0;
          return (
            <div key={d.id} className="item-card debt-card">
              <div className="item-card-head">
                <span className="row-card-title" style={{ fontWeight: 600 }}>{d.name}</span>
                <button type="button" className="icon-btn" style={{ color: "var(--primary)" }} aria-label="Ubah nama" title="Ubah"
                  onClick={() => openSheet({ kind: "rename", debt: d })}>
                  <Pencil size={18} />
                </button>
                <button type="button" className="icon-btn" style={{ color: "var(--coral)" }} aria-label="Hapus" title="Hapus"
                  onClick={() => remove(d)}>
                  <Trash2 size={20} />
                </button>
              </div>
              <span className="stamp">{d.type}{isPaidOff && " · Lunas"}</span>
              <div className="progress-track progress-thin" style={{ height: 8, margin: "4px 0 0" }}>
                <div className="progress-fill" style={{ width: `${pct}%`, background: isPaidOff ? "var(--success)" : "var(--gold)" }} />
              </div>
              <p className="mono" style={{ fontSize: 12.5 }}>
                Sisa {rp(Number(d.remainingAmount))} dari {rp(Number(d.totalAmount))} · {rp(Number(d.monthlyInstallment))}/bln
              </p>
              {!isPaidOff && (
                <button type="button" className="btn-outline btn-outline-sm" onClick={() => openSheet({ kind: "pay", debt: d })}>
                  Catat pembayaran
                </button>
              )}
            </div>
          );
        })
      )}

      <button type="button" className="fab" aria-label="Tambah utang" onClick={() => openSheet({ kind: "add" })}>
        <Plus size={26} />
      </button>

      {sheet && (
        <Sheet title={sheetTitle} onClose={() => setSheet(null)} onSubmit={submitSheet}>
          {sheet.kind === "pay" && (
            <>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: -8 }}>
                Sisa saat ini: {rp(Number(sheet.debt.remainingAmount))}
              </p>
              <CurrencyInput placeholder="Jumlah pembayaran (Rp)" value={payAmount} onChange={setPayAmount} required />
            </>
          )}
          {sheet.kind !== "pay" && (
            <input className="field-input" autoFocus required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nama utang (mis. KPR Rumah)" />
          )}
          {sheet.kind === "add" && (
            <>
              <select className="field-input" value={type} onChange={(e) => setType(e.target.value)} aria-label="Jenis utang">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <CurrencyInput placeholder="Total pokok utang (Rp)" value={totalAmount} onChange={setTotalAmount} required />
              <CurrencyInput placeholder="Cicilan per bulan (Rp)" value={monthlyInstallment} onChange={setMonthlyInstallment} required />
              <label className="outlined-field">
                <span>Tanggal mulai</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </label>
            </>
          )}
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? "Menyimpan…" : sheet.kind === "add" ? "Tambah" : sheet.kind === "pay" ? "Bayar" : "Simpan"}
          </button>
        </Sheet>
      )}
    </main>
  );
}
