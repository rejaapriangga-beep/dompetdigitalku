// app/ui.tsx
// Komponen kecil bergaya app Android yang dipakai beberapa halaman.
"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";

export const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

/** Panel bawah (showModalBottomSheet di app Android). */
export function Sheet({
  title,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  children: ReactNode;
}) {
  const body = (
    <>
      <div className="sheet-handle" />
      <div className="sheet-title-row">
        <p className="sheet-title">{title}</p>
        <button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </>
  );
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      {onSubmit ? (
        <form className="sheet" role="dialog" aria-modal="true" aria-label={title} onSubmit={onSubmit}>
          {body}
        </form>
      ) : (
        <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
          {body}
        </div>
      )}
    </>
  );
}

/** TabBar Material: label rata lebar, tab aktif bergaris bawah. */
export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="tab-bar" role="tablist">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          className={`tab-bar-item ${value === key ? "active" : ""}`}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Kartu total besar (StatCard di app Android). */
export function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: LucideIcon;
}) {
  return (
    <div className="stat-big">
      <div className="stat-big-icon" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
        <Icon size={20} color={color} />
      </div>
      <p className="stat-big-label">{label}</p>
      <p className="stat-big-value mono" style={{ color }}>{rp(value)}</p>
    </div>
  );
}

/** Judul seksi dengan aksi di kanan (mis. "+ Tambah"). */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="section-head" style={{ margin: "20px 0 8px" }}>
      <p className="section-head-title" style={{ fontSize: 16 }}>{title}</p>
      {action}
    </div>
  );
}
