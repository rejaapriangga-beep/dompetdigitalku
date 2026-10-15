// app/settings/categories/page.tsx
// Kategori Transaksi — disamakan dengan lib/screens/categories_screen.dart di
// app Android: tab Pengeluaran/Pemasukan, isian tambah di atas daftar, ubah
// nama langsung di baris (centang = simpan, silang = batal).
"use client";

import { useEffect, useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import { TabBar } from "../../ui";

type CatType = "income" | "expense";
type Category = { id: string; name: string; type: CatType };

const TABS = [
  ["expense", "Kategori Pengeluaran"],
  ["income", "Kategori Pemasukan"],
] as const;

export default function CategoriesSettingsPage() {
  const [tab, setTab] = useState<CatType>("expense");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editError, setEditError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/categories");
    if (res.ok) setCategories((await res.json()).categories);
    setLoading(false);
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal saat mount, bukan derived state
    load();
  }, []);

  const isExpense = tab === "expense";
  const shown = categories.filter((c) => c.type === tab);

  const changeTab = (t: CatType) => {
    setTab(t);
    setName("");
    setError("");
    setEditingId(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Nama kategori wajib diisi.");
    setAdding(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type: tab }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) {
      setError(data.error || "Gagal menambah kategori.");
      return;
    }
    setName("");
    load();
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditingName(c.name);
    setEditError("");
  };

  const saveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setEditError("");
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setEditError(data.error || "Gagal mengubah kategori.");
      return;
    }
    setEditingId(null);
    load();
  };

  const remove = async (c: Category) => {
    if (!confirm(`Hapus kategori "${c.name}"?`)) return;
    const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Gagal menghapus kategori.");
      return;
    }
    load();
  };

  return (
    <main className="page-main page-main-tabs">
      <TabBar tabs={TABS} value={tab} onChange={changeTab} />

      <p className="page-note">
        {isExpense
          ? "Kategori pengeluaran dipakai untuk memilih kategori transaksi pengeluaran, dan menjadi daftar kategori Anggaran Bulanan."
          : "Kategori pemasukan dipakai untuk memilih kategori transaksi pemasukan."}
      </p>

      <form onSubmit={submit} className="inline-add">
        <input
          className="field-input"
          placeholder={isExpense ? "Nama kategori baru (mis. Donasi)" : "Nama kategori baru (mis. Hadiah)"}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={adding}>
          {adding ? "…" : "Tambah"}
        </button>
      </form>
      {error && <p className="form-error" style={{ marginTop: 6 }}>{error}</p>}

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <p className="empty-note">Memuat...</p>
        ) : shown.length === 0 ? (
          <p className="empty-note" style={{ textAlign: "left" }}>
            Belum ada kategori {isExpense ? "pengeluaran" : "pemasukan"}.
          </p>
        ) : (
          shown.map((c) =>
            editingId === c.id ? (
              <form key={c.id} className="row-card" onSubmit={(e) => { e.preventDefault(); saveEdit(c.id); }}>
                <input
                  className="cat-edit-input"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  aria-label="Nama kategori"
                  autoFocus
                />
                <button type="submit" className="icon-btn" style={{ color: "var(--primary)" }} aria-label="Simpan" title="Simpan">
                  <Check size={20} />
                </button>
                <button type="button" className="icon-btn" style={{ color: "var(--coral)" }} aria-label="Batal" title="Batal"
                  onClick={() => setEditingId(null)}>
                  <X size={20} />
                </button>
              </form>
            ) : (
              <div key={c.id} className="row-card">
                <span className="stamp">{c.name}</span>
                <span style={{ flex: 1 }} />
                <button type="button" className="text-btn" onClick={() => startEdit(c)}>Ubah</button>
                <button type="button" className="icon-btn" style={{ color: "var(--coral)" }} aria-label="Hapus" title="Hapus"
                  onClick={() => remove(c)}>
                  <Trash2 size={20} />
                </button>
              </div>
            )
          )
        )}
        {editError && <p className="form-error">{editError}</p>}
      </div>
    </main>
  );
}
