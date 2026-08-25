// app/settings/account/page.tsx
// Halaman "Akun Saya" — saat ini isinya cuma Zona Berbahaya (hapus akun),
// tempat yang wajar untuk menambah pengaturan akun lain nanti.
"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function AccountSettingsPage() {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim().toUpperCase() === "HAPUS";

  const handleDelete = async () => {
    if (!canDelete) return;
    if (!window.confirm("Yakin? Semua data keuangan rumah tangga ini akan terhapus permanen dan tidak bisa dikembalikan.")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menghapus akun.");
        setLoading(false);
        return;
      }
      await signOut({ callbackUrl: "/login" });
    } catch {
      setError("Gagal terhubung ke server.");
      setLoading(false);
    }
  };

  return (
    <main className="page-main">
      <p className="page-title">Akun Saya</p>

      <div className="panel" style={{ borderColor: "var(--coral)" }}>
        <p className="panel-title" style={{ color: "var(--coral)" }}>Zona Berbahaya</p>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-soft)", marginBottom: 12 }}>
          Menghapus akun akan menghapus secara permanen akun Anda beserta{" "}
          <strong>seluruh data rumah tangga</strong> (transaksi, akun kas/bank, aset, utang, investasi, dan
          anggaran). Tindakan ini <strong>tidak bisa dibatalkan</strong>. Jika rumah tangga Anda memiliki anggota
          lain, hubungi <a href="mailto:privacy@dompetdigitalku.my.id" className="link-plain">privacy@dompetdigitalku.my.id</a> terlebih dahulu.
        </p>
        <p className="field-label">
          Ketik <strong>HAPUS</strong> untuk konfirmasi
        </p>
        <input
          className="field-input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="HAPUS"
          style={{ marginBottom: 12, maxWidth: 220 }}
        />
        {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}
        <button
          type="button"
          className="btn"
          disabled={!canDelete || loading}
          onClick={handleDelete}
          style={{
            background: canDelete ? "var(--coral)" : "var(--border)",
            color: "#fff",
            cursor: canDelete && !loading ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Menghapus..." : "Hapus Akun & Semua Data"}
        </button>
      </div>

      <p style={{ fontSize: 12.5, marginTop: 16 }}>
        <Link href="/" className="link-plain">← Kembali ke Beranda</Link>
      </p>
    </main>
  );
}
