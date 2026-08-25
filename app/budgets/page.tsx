// app/budgets/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CurrencyInput } from "../currency-input";

type Category = { id: string; name: string };
type Budget = { categoryId: string; monthlyAmount: string };

export default function BudgetsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingCat, setSavingCat] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [catRes, budgetRes] = await Promise.all([fetch("/api/categories?type=expense"), fetch("/api/budgets")]);
    if (catRes.ok) setCategories((await catRes.json()).categories);
    if (budgetRes.ok) {
      const map: Record<string, string> = {};
      ((await budgetRes.json()).budgets as Budget[]).forEach((b) => {
        map[b.categoryId] = b.monthlyAmount;
      });
      setBudgets(map);
    }
    setLoading(false);
  };
  useEffect(() => {
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

  return (
    <main className="page-main">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 className="page-title">Anggaran Bulanan</h1>
        <Link href="/settings/categories" className="link-plain" style={{ fontSize: 12.5 }}>Kelola kategori →</Link>
      </div>
      <div className="panel">
        {loading ? (
          <p className="empty-note">Memuat...</p>
        ) : categories.length === 0 ? (
          <p className="empty-note">
            Belum ada kategori. <Link href="/settings/categories" className="link-plain">Tambah kategori dulu →</Link>
          </p>
        ) : (
          categories.map((c) => (
            <div key={c.id} className="item-row">
              <span className="stamp">{c.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CurrencyInput
                  placeholder="0"
                  className="field-input mono"
                  style={{ width: 140, textAlign: "right" }}
                  value={budgets[c.id] ?? ""}
                  onChange={(v) => setBudgets((b) => ({ ...b, [c.id]: v }))}
                  onBlur={() => save(c.id, budgets[c.id] ?? "")}
                />
                {savingCat === c.id && <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>menyimpan…</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
