// app/recent-transactions.tsx
"use client";

import { useState } from "react";

type RecentTx = {
  id: string;
  type: string;
  amount: string;
  name: string;
  category: string;
  date: string;
  accountName: string | null;
};

const COLLAPSED_COUNT = 3;

export function RecentTransactions({ transactions }: { transactions: RecentTx[] }) {
  const [expanded, setExpanded] = useState(false);

  if (transactions.length === 0) {
    return (
      <div className="panel">
        <p className="panel-title">Transaksi Terakhir</p>
        <p className="empty-note">Belum ada transaksi.</p>
      </div>
    );
  }

  const visible = expanded ? transactions : transactions.slice(0, COLLAPSED_COUNT);

  return (
    <div className="panel">
      <p className="panel-title">Transaksi Terakhir</p>
      {visible.map((t) => (
        <div key={t.id} className="item-row">
          <span>
            <span className="stamp">{t.category}</span>{" "}
            <span style={{ marginLeft: 6 }}>{t.name}</span>{" "}
            <span style={{ fontSize: 11, color: "var(--ink-soft)", marginLeft: 6 }}>
              {new Date(t.date).toLocaleDateString("id-ID")}
              {t.accountName && ` · ${t.accountName}`}
            </span>
          </span>
          <span className={`mono ${t.type === "expense" ? "text-expense" : "text-income"}`}>
            {t.type === "expense" ? "-" : "+"}Rp{Number(t.amount).toLocaleString("id-ID")}
          </span>
        </div>
      ))}
      {transactions.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="btn btn-secondary btn-block"
          style={{ marginTop: 10 }}
        >
          {expanded ? "Sembunyikan" : `Lihat ${transactions.length} transaksi terakhir`}
        </button>
      )}
    </div>
  );
}
