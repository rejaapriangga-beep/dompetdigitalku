// app/budgets/page.tsx
// Anggaran Bulanan — disamakan dengan lib/screens/budgets_screen.dart di app
// Android: tab "Set Anggaran" (isian per kategori + realisasi bulan ini) dan
// "Historis" (rekap per bulan). Anggaran tidak diversi per bulan di backend,
// jadi rekap historis memakai anggaran yang aktif SAAT INI sebagai acuan.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CurrencyInput } from "../currency-input";
import { rp, Sheet, TabBar } from "../ui";

type Category = { id: string; name: string };
type Budget = { categoryId: string; monthlyAmount: string };
type Transaction = {
  id: string;
  type: string;
  amount: string;
  name: string;
  date: string;
  account: { name: string } | null;
  category: { id: string; name: string };
};

const TABS = [
  ["set", "Set Anggaran"],
  ["historis", "Historis"],
] as const;

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

function statusColor(pct: number) {
  return pct >= 100 ? "var(--coral)" : pct >= 80 ? "var(--gold)" : "var(--success)";
}

function SummaryCard({ title, spent, budget }: { title: string; spent: number; budget: number }) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const color = statusColor(pct);
  return (
    <div className="budget-summary" style={{ background: `color-mix(in srgb, ${color} 10%, var(--surface))` }}>
      <div className="budget-summary-head">
        <span>{title}</span>
        <strong style={{ color }}>{pct.toFixed(0)}%</strong>
      </div>
      <p className="mono budget-summary-value">{rp(spent)} dari {rp(budget)}</p>
      <div className="progress-track progress-thin" style={{ height: 8 }}>
        <div className="progress-fill" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const [tab, setTab] = useState<"set" | "historis">("set");
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCat, setSavingCat] = useState<string | null>(null);
  const [listSheet, setListSheet] = useState<{ title: string; items: Transaction[] } | null>(null);

  const load = async () => {
    setLoading(true);
    const [catRes, budgetRes, txRes] = await Promise.all([
      fetch("/api/categories?type=expense"),
      fetch("/api/budgets"),
      fetch("/api/transactions"),
    ]);
    if (catRes.ok) setCategories((await catRes.json()).categories);
    if (budgetRes.ok) {
      const map: Record<string, string> = {};
      ((await budgetRes.json()).budgets as Budget[]).forEach((b) => {
        map[b.categoryId] = String(Math.round(Number(b.monthlyAmount)));
      });
      setBudgets(map);
    }
    if (txRes.ok) setTransactions((await txRes.json()).transactions);
    setLoading(false);
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal saat mount, bukan derived state
    load();
  }, []);

  const save = async (categoryId: string, value: string) => {
    setSavingCat(categoryId);
    await fetch("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, monthlyAmount: value || 0 }),
    });
    setSavingCat(null);
  };

  const budgetOf = (id: string) => Math.max(0, Number(budgets[id] || 0));
  const thisMonth = monthKey(new Date());
  const expensesThisMonth = transactions.filter((t) => t.type === "expense" && monthKey(new Date(t.date)) === thisMonth);
  const spentOf = (id: string) =>
    expensesThisMonth.filter((t) => t.category.id === id).reduce((s, t) => s + Number(t.amount), 0);

  const budgetedIds = new Set(categories.filter((c) => budgetOf(c.id) > 0).map((c) => c.id));
  const totalBudget = categories.reduce((s, c) => s + budgetOf(c.id), 0);
  const totalSpent = [...budgetedIds].reduce((s, id) => s + spentOf(id), 0);

  // Rekap per bulan: pengeluaran pada kategori yang anggarannya diatur.
  const recaps = (() => {
    if (totalBudget <= 0) return [];
    const byMonth = new Map<string, { month: Date; spent: number; items: Transaction[] }>();
    for (const t of transactions) {
      if (t.type !== "expense" || !budgetedIds.has(t.category.id)) continue;
      const d = new Date(t.date);
      const key = monthKey(d);
      const entry = byMonth.get(key) ?? { month: new Date(d.getFullYear(), d.getMonth(), 1), spent: 0, items: [] };
      entry.spent += Number(t.amount);
      entry.items.push(t);
      byMonth.set(key, entry);
    }
    return [...byMonth.values()].sort((a, b) => b.month.getTime() - a.month.getTime());
  })();

  const monthLabel = (d: Date) => d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <main className="page-main page-main-tabs">
      <TabBar tabs={TABS} value={tab} onChange={setTab} />

      {loading ? (
        <p className="empty-note">Memuat...</p>
      ) : tab === "set" ? (
        categories.length === 0 ? (
          <p className="empty-note">
            Belum ada kategori. <Link href="/settings/categories" className="link-plain">Tambah kategori dulu →</Link>
          </p>
        ) : (
          <>
            {totalBudget > 0 && (
              <SummaryCard title="Total Realisasi Bulan Ini" spent={totalSpent} budget={totalBudget} />
            )}
            {categories.map((c) => {
              const budget = budgetOf(c.id);
              const spent = spentOf(c.id);
              const pct = budget > 0 ? (spent / budget) * 100 : 0;
              const color = statusColor(pct);
              return (
                <div key={c.id} className="item-card">
                  <div className="item-card-head">
                    <button type="button" className="stamp stamp-button"
                      onClick={() => setListSheet({
                        title: `${c.name} — ${monthLabel(new Date())}`,
                        items: expensesThisMonth.filter((t) => t.category.id === c.id),
                      })}>
                      {c.name}
                    </button>
                    <span style={{ flex: 1 }} />
                    <label className="budget-input">
                      <span>Rp</span>
                      <CurrencyInput
                        placeholder=""
                        className="mono"
                        value={budgets[c.id] ?? ""}
                        onChange={(v) => setBudgets((b) => ({ ...b, [c.id]: v }))}
                        onBlur={() => save(c.id, budgets[c.id] ?? "")}
                      />
                    </label>
                  </div>
                  {savingCat === c.id && <p style={{ fontSize: 10.5, color: "var(--ink-soft)", textAlign: "right" }}>menyimpan…</p>}
                  {budget > 0 && (
                    <>
                      <div className="budget-line">
                        <span>Terpakai {rp(spent)} dari {rp(budget)}</span>
                        <strong style={{ color }}>{pct.toFixed(0)}%</strong>
                      </div>
                      <div className="progress-track progress-thin" style={{ height: 6 }}>
                        <div className="progress-fill" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </>
        )
      ) : recaps.length === 0 ? (
        <p className="empty-note" style={{ textAlign: "left" }}>
          Belum ada data historis. Atur anggaran &amp; catat transaksi pengeluaran agar rekap pencapaian per bulan muncul di sini.
        </p>
      ) : (
        recaps.map((r) => (
          <div key={r.month.toISOString()} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 6px 2px" }}>{monthLabel(r.month)}</p>
            <button type="button" className="plain-button"
              onClick={() => setListSheet({ title: monthLabel(r.month), items: r.items })}>
              <SummaryCard title="Total Realisasi" spent={r.spent} budget={totalBudget} />
            </button>
          </div>
        ))
      )}

      {listSheet && (
        <Sheet title={listSheet.title} onClose={() => setListSheet(null)}>
          {listSheet.items.length === 0 ? (
            <p className="empty-note">Belum ada transaksi.</p>
          ) : (
            listSheet.items
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((t) => (
                <div key={t.id} className="tx-row" style={{ cursor: "default" }}>
                  <div className="tx-main">
                    <div className="tx-top">
                      <span className="stamp">{t.category.name}</span>
                      <span className="tx-name">{t.name}</span>
                    </div>
                    <p className="tx-meta">
                      {new Date(t.date).toLocaleDateString("id-ID")}
                      {t.account && ` · ${t.account.name}`}
                    </p>
                  </div>
                  <span className="mono tx-amount text-expense">-{rp(Number(t.amount))}</span>
                </div>
              ))
          )}
        </Sheet>
      )}
    </main>
  );
}
