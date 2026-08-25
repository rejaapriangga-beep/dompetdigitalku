// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CurrencyInput } from "../currency-input";
import { scanInvoiceImage } from "../ocr-scan";
import { saveLocalInvoice, getLocalInvoice, deleteLocalInvoice, getLocalInvoiceIds } from "../local-invoice-store";

type Transaction = {
  id: string;
  type: string;
  amount: string;
  name: string;
  date: string;
  note: string | null;
  invoiceUrl: string | null;
  accountId: string;
  debtId: string | null;
  account: { name: string } | null;
  debt: { name: string } | null;
  category: { id: string; name: string };
};
type Account = { id: string; name: string; type: string; balance: number };
type Debt = { id: string; name: string; remainingAmount: string };
type Category = { id: string; name: string; type: "income" | "expense" };

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState("");
  const [debtId, setDebtId] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceStorage, setInvoiceStorage] = useState<"server" | "local">("local");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState("");
  const [localInvoiceIds, setLocalInvoiceIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [txRes, accRes, debtRes, catRes] = await Promise.all([
      fetch("/api/transactions"),
      fetch("/api/accounts"),
      fetch("/api/debts"),
      fetch("/api/categories"),
    ]);
    if (txRes.ok) {
      const txs: Transaction[] = (await txRes.json()).transactions;
      setTransactions(txs);
      getLocalInvoiceIds(txs.map((t) => t.id)).then(setLocalInvoiceIds);
    }
    if (accRes.ok) {
      const accs: Account[] = (await accRes.json()).accounts;
      setAccounts(accs);
      setAccountId((prev) => prev || accs[0]?.id || "");
    }
    if (debtRes.ok) setDebts((await debtRes.json()).debts);
    if (catRes.ok) {
      const cats: Category[] = (await catRes.json()).categories;
      setCategories(cats);
      setCategoryId((prev) => prev || cats.find((c) => c.type === "expense")?.id || cats[0]?.id || "");
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const activeDebts = debts.filter((d) => Number(d.remainingAmount) > 0);
  const categoriesForType = categories.filter((c) => c.type === type);
  // Transaksi lama (sebelum kategori dipisah Pemasukan/Pengeluaran) bisa saja
  // menunjuk ke kategori yang tipenya sekarang tidak cocok lagi — tetap
  // ditampilkan saat diedit supaya tidak jadi kosong/rusak.
  const selectedCategoryOutsideType = categories.find((c) => c.id === categoryId && c.type !== type);

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === "income") acc.income += Number(t.amount);
      else acc.expense += Number(t.amount);
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setType(t.type);
    setAmount(String(Math.round(Number(t.amount))));
    setName(t.name);
    setCategoryId(t.category.id);
    setDate(t.date.slice(0, 10));
    setNote(t.note || "");
    setAccountId(t.accountId);
    setDebtId(t.debtId || "");
    setInvoiceFile(null);
    setScanNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAmount("");
    setName("");
    setNote("");
    setDebtId("");
    setInvoiceFile(null);
    setScanNotice("");
    setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (editingId) {
      const res = await fetch(`/api/transactions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount, name, categoryId, date, note, accountId, debtId: debtId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan perubahan.");
        return;
      }
      cancelEdit();
      load();
      return;
    }

    if (invoiceFile && invoiceFile.size > 10 * 1024 * 1024) {
      setError("Ukuran foto invoice maksimal 10MB.");
      return;
    }

    let invoiceUrl: string | null = null;
    // Mode "server": upload dulu sebelum transaksi dibuat, seperti biasa.
    if (invoiceFile && invoiceStorage === "server") {
      setUploading(true);
      try {
        const presignRes = await fetch("/api/uploads/presign-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: invoiceFile.name, contentType: invoiceFile.type, fileSize: invoiceFile.size }),
        });
        const presignData = await presignRes.json();
        if (!presignRes.ok) {
          setError(presignData.error || "Gagal menyiapkan unggahan invoice.");
          setUploading(false);
          return;
        }
        const putRes = await fetch(presignData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": invoiceFile.type },
          body: invoiceFile,
        });
        if (!putRes.ok) {
          setError("Gagal mengunggah foto invoice.");
          setUploading(false);
          return;
        }
        invoiceUrl = presignData.key;
      } catch {
        setError("Gagal mengunggah foto invoice.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount, name, categoryId, date, note, invoiceUrl, accountId, debtId: debtId || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menambah transaksi.");
      return;
    }

    // Mode "lokal": baru sekarang, setelah transaksi ada ID-nya, simpan file
    // itu ke IndexedDB di HP ini saja. Tidak pernah dikirim ke server.
    if (invoiceFile && invoiceStorage === "local") {
      try {
        await saveLocalInvoice(data.transaction.id, invoiceFile);
      } catch {
        setError("Transaksi tersimpan, tapi foto invoice gagal disimpan lokal (mungkin storage HP penuh).");
      }
    }

    setAmount("");
    setName("");
    setNote("");
    setDebtId("");
    setInvoiceFile(null);
    setScanNotice("");
    load();
  };

  const handleScan = async (file: File | undefined) => {
    if (!file) return;
    // Foto yang sama ini juga jadi lampiran invoice transaksi (kalau Anda
    // lanjut simpan) — jadi tidak perlu pilih foto dua kali.
    setInvoiceFile(file);
    setScanning(true);
    setScanNotice("");
    setError("");
    try {
      // OCR-nya sendiri HANYA diproses di memori browser, lalu dibuang — teks
      // hasil baca tidak pernah dikirim ke server. Foto aslinya baru terkirim
      // (atau tidak, sesuai pilihan Anda di bawah) saat transaksi disimpan.
      const result = await scanInvoiceImage(file);
      if (result.amount) setAmount(result.amount);
      if (result.date) setDate(result.date);
      if (result.vendor) setName(result.vendor);

      const found = [
        result.amount && "jumlah",
        result.date && "tanggal",
        result.vendor && "nama toko",
      ].filter(Boolean);
      setScanNotice(
        found.length > 0
          ? `Terbaca: ${found.join(", ")}. Periksa & lengkapi kategori sebelum simpan.`
          : "Tidak ada data yang terbaca jelas dari foto ini. Silakan isi manual."
      );
    } catch {
      setScanNotice("Gagal membaca invoice. Silakan isi manual.");
    } finally {
      setScanning(false);
    }
  };

  const viewLocalInvoice = async (id: string) => {
    const stored = await getLocalInvoice(id);
    if (!stored) return;
    const url = URL.createObjectURL(stored.blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus transaksi ini?")) return;
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Gagal menghapus transaksi.");
      return;
    }
    // Selalu coba hapus (aman & jadi no-op kalau memang tidak ada entri lokal
    // untuk id ini) — jangan gantungkan ke state localInvoiceIds yang bisa saja
    // belum sinkron.
    await deleteLocalInvoice(id).catch(() => {});
    load();
  };

  return (
    <main className="page-main">
      <h1 className="page-title">Transaksi</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <p className="stat-label">Pemasukan</p>
          <p className="stat-value mono text-income">Rp{totals.income.toLocaleString("id-ID")}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Pengeluaran</p>
          <p className="stat-value mono text-expense">Rp{totals.expense.toLocaleString("id-ID")}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Saldo</p>
          <p className="stat-value mono">Rp{(totals.income - totals.expense).toLocaleString("id-ID")}</p>
        </div>
      </div>

      {!editingId && (
        <div className="form-card">
          <label className="field-label">Scan Invoice (opsional)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="field-label" style={{ fontSize: 11 }}>📷 Ambil foto</label>
              <input
                className="field-input"
                type="file"
                accept="image/*"
                capture="environment"
                disabled={scanning}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  handleScan(file);
                  e.target.value = "";
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="field-label" style={{ fontSize: 11 }}>📁 Upload file</label>
              <input
                className="field-input"
                type="file"
                accept="image/*"
                disabled={scanning}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  handleScan(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: 0 }}>
            Diproses langsung di HP/browser Anda — foto tidak pernah dikirim atau disimpan di server.
          </p>
          {scanning && <p style={{ fontSize: 12.5, color: "var(--primary)", margin: 0 }}>Membaca invoice…</p>}
          {scanNotice && !scanning && <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0 }}>{scanNotice}</p>}
        </div>
      )}

      <form onSubmit={submit} className="form-card">
        {editingId && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <p className="panel-title" style={{ marginBottom: 0 }}>Ubah Transaksi</p>
            <button type="button" onClick={cancelEdit} className="link-plain" style={{ fontSize: 12.5 }}>Batal</button>
          </div>
        )}
        <select
          className="field-input"
          value={type}
          onChange={(e) => {
            const newType = e.target.value;
            setType(newType);
            setCategoryId(categories.find((c) => c.type === newType)?.id || "");
          }}
        >
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
        </select>
        <CurrencyInput placeholder="Jumlah (Rp)" value={amount} onChange={setAmount} required />
        <input className="field-input" placeholder="Nama Transaksi (mis. Makan siang di warung Bu As)" value={name} onChange={(e) => setName(e.target.value)} required />

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <label className="field-label">Kategori</label>
            <Link href="/settings/categories" className="link-plain" style={{ fontSize: 11.5 }}>Kelola kategori →</Link>
          </div>
          <select className="field-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            {categoriesForType.length === 0 && !selectedCategoryOutsideType && (
              <option value="">Belum ada kategori {type === "expense" ? "pengeluaran" : "pemasukan"}</option>
            )}
            {selectedCategoryOutsideType && (
              <option value={selectedCategoryOutsideType.id}>{selectedCategoryOutsideType.name} (kategori lama)</option>
            )}
            {categoriesForType.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <input className="field-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

        <div>
          <label className="field-label">Akun kas/bank</label>
          <select className="field-input" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
            {accounts.length === 0 && <option value="">Belum ada akun</option>}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
            ))}
          </select>
        </div>

        {type === "expense" && activeDebts.length > 0 && (
          <div>
            <label className="field-label">Kaitkan ke utang (opsional, mengurangi sisa utang)</label>
            <select className="field-input" value={debtId} onChange={(e) => setDebtId(e.target.value)}>
              <option value="">Tidak dikaitkan</option>
              {activeDebts.map((d) => (
                <option key={d.id} value={d.id}>{d.name} — sisa Rp{Number(d.remainingAmount).toLocaleString("id-ID")}</option>
              ))}
            </select>
          </div>
        )}

        <input className="field-input" placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />
        {invoiceFile && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label className="field-label">Simpan foto invoice ini di mana?</label>
              <button
                type="button"
                onClick={() => { setInvoiceFile(null); setScanNotice(""); }}
                className="link-plain"
                style={{ fontSize: 11.5, background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
              >
                Batal lampirkan
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="radio" checked={invoiceStorage === "local"} onChange={() => setInvoiceStorage("local")} />
                HP ini saja — tidak pernah dikirim ke server, tapi tidak bisa dilihat dari device lain & bisa hilang kalau data browser dihapus
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="radio" checked={invoiceStorage === "server"} onChange={() => setInvoiceStorage("server")} />
                Server — bisa dilihat dari device lain, tersimpan lebih aman jangka panjang
              </label>
            </div>
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={uploading || !accountId || !categoryId}>
          {uploading ? "Mengunggah invoice…" : editingId ? "Simpan Perubahan" : "Tambah"}
        </button>
        {error && <p className="form-error">{error}</p>}
      </form>

      <div className="panel">
        <p className="panel-title">Riwayat</p>
        {loading ? (
          <p className="empty-note">Memuat...</p>
        ) : transactions.length === 0 ? (
          <p className="empty-note">Belum ada transaksi.</p>
        ) : (
          transactions.map((t) => (
            <div key={t.id} className="item-row">
              <span>
                <span className="stamp">{t.category.name}</span>{" "}
                <span style={{ marginLeft: 6 }}>{t.name}</span>{" "}
                <span style={{ fontSize: 11, color: "var(--ink-soft)", marginLeft: 6 }}>
                  {new Date(t.date).toLocaleDateString("id-ID")}
                  {t.account && ` · ${t.account.name}`}
                  {t.debt && ` · Bayar utang: ${t.debt.name}`}
                </span>
                {t.invoiceUrl && (
                  <a
                    href={`/api/uploads/view?key=${encodeURIComponent(t.invoiceUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-plain"
                    style={{ fontSize: 11, marginLeft: 8 }}
                  >
                    Lihat invoice
                  </a>
                )}
                {localInvoiceIds.has(t.id) && (
                  <button
                    onClick={() => viewLocalInvoice(t.id)}
                    className="link-plain"
                    style={{ fontSize: 11, marginLeft: 8, background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
                  >
                    Lihat invoice (HP ini)
                  </button>
                )}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`mono ${t.type === "expense" ? "text-expense" : "text-income"}`}>
                  {t.type === "expense" ? "-" : "+"}Rp{Number(t.amount).toLocaleString("id-ID")}
                </span>
                <button onClick={() => startEdit(t)} className="link-plain" style={{ fontSize: 12.5, background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}>
                  Ubah
                </button>
                <button onClick={() => remove(t.id)} className="btn-danger">Hapus</button>
              </span>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
