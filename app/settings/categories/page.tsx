// app/settings/categories/page.tsx
"use client";

import { useEffect, useState } from "react";

type Category = { id: string; name: string; type: "income" | "expense" };
type CatType = "income" | "expense";

export default function CategoriesSettingsPage() {
  const [tab, setTab] = useState<CatType>("expense");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
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
    load();
  }, []);

  const shown = categories.filter((c) => c.type === tab);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type: tab }),
    });
    const data = await res.json();
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

  const remove = async (id: string) => {
    if (!confirm("Hapus kategori ini?")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Gagal menghapus kategori.");
      return;
    }
    load();
  };

  return (
    <main className="page-main">
      <h1 className="page-title">Kategori Transaksi</h1>
      <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: -8, marginBottom: 16 }}>
        Kategori di sini dipakai untuk memilih kategori transaksi (bukan diketik bebas lagi). Kategori Pengeluaran
        juga menjadi daftar kategori Anggaran Bulanan.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button type="button" className={`nav-tab ${tab === "expense" ? "active" : ""}`} onClick={() => setTab("expense")}>
          Kategori Pengeluaran
        </button>
        <button type="button" className={`nav-tab ${tab === "income" ? "active" : ""}`} onClick={() => setTab("income")}>
          Kategori Pemasukan
        </button>
      </div>

      <form onSubmit={submit} className="form-card">
        <input
          className="field-input"
          placeholder={tab === "expense" ? "Nama kategori baru (mis. Donasi)" : "Nama kategori baru (mis. Hadiah)"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary">Tambah Kategori</button>
        {error && <p className="form-error">{error}</p>}
      </form>

      <div className="panel">
        {loading ? (
          <p className="empty-note">Memuat...</p>
        ) : shown.length === 0 ? (
          <p className="empty-note">
            Belum ada kategori {tab === "expense" ? "pengeluaran" : "pemasukan"}.
          </p>
        ) : (
          shown.map((c) => (
            <div key={c.id} className="item-row">
              {editingId === c.id ? (
                <>
                  <input
                    className="field-input"
                    style={{ flex: 1, marginRight: 8 }}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                  />
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => saveEdit(c.id)} className="btn btn-secondary">Simpan</button>
                    <button onClick={() => setEditingId(null)} className="btn-danger">Batal</button>
                  </span>
                </>
              ) : (
                <>
                  <span className="stamp">{c.name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => startEdit(c)} className="link-plain" style={{ fontSize: 12.5 }}>Ubah</button>
                    <button onClick={() => remove(c.id)} className="btn-danger">Hapus</button>
                  </span>
                </>
              )}
            </div>
          ))
        )}
        {editError && <p className="form-error">{editError}</p>}
      </div>
    </main>
  );
}
