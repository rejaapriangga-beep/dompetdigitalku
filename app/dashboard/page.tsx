// app/dashboard/page.tsx
// Halaman Transaksi — disamakan dengan lib/screens/transactions_screen.dart
// di app Android: ringkasan 3 kolom, riwayat dengan filter, dan form tambah/
// ubah transaksi di panel bawah (bottom sheet) yang dibuka lewat tombol +.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Camera, Check, Image as ImageIcon, Plus, Receipt, Search, Trash2, X } from "lucide-react";
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

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

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
  const [sheetOpen, setSheetOpen] = useState(false);

  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal saat mount, bukan derived state
    load();
    // Tombol + di Beranda membuka halaman ini dengan ?tambah=1.
    if (new URLSearchParams(window.location.search).get("tambah") === "1") {
      setSheetOpen(true);
      window.history.replaceState(null, "", "/dashboard");
    }
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

  const categoriesForFilter = typeFilter === "all" ? categories : categories.filter((c) => c.type === typeFilter);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter && t.category.id !== categoryFilter) return false;
      const d = t.date.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, dateFrom, dateTo, search]);

  const changeTypeFilter = (value: "all" | "income" | "expense") => {
    setTypeFilter(value);
    if (categoryFilter && value !== "all" && categories.find((c) => c.id === categoryFilter)?.type !== value) {
      setCategoryFilter("");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setAmount("");
    setName("");
    setNote("");
    setDebtId("");
    setInvoiceFile(null);
    setScanNotice("");
    setError("");
  };

  const openAdd = () => {
    resetForm();
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    resetForm();
  };

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
    setSheetOpen(true);
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
      closeSheet();
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
        alert("Transaksi tersimpan, tapi foto invoice gagal disimpan lokal (mungkin storage HP penuh).");
      }
    }

    closeSheet();
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

  const viewInvoice = async (t: Transaction) => {
    if (localInvoiceIds.has(t.id)) {
      const stored = await getLocalInvoice(t.id);
      if (!stored) return;
      const url = URL.createObjectURL(stored.blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    if (t.invoiceUrl) {
      window.open(`/api/uploads/view?key=${encodeURIComponent(t.invoiceUrl)}`, "_blank", "noopener,noreferrer");
    }
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
      <div className="mini-stats">
        <div className="mini-stat">
          <p className="mini-stat-label">Pemasukan</p>
          <p className="mini-stat-value mono" style={{ color: "var(--primary)" }}>{rp(totals.income)}</p>
        </div>
        <div className="mini-stat">
          <p className="mini-stat-label">Pengeluaran</p>
          <p className="mini-stat-value mono" style={{ color: "var(--coral)" }}>{rp(totals.expense)}</p>
        </div>
        <div className="mini-stat">
          <p className="mini-stat-label">Saldo</p>
          <p className="mini-stat-value mono" style={{ color: "var(--sky)" }}>{rp(totals.income - totals.expense)}</p>
        </div>
      </div>

      <p className="section-head-title" style={{ fontSize: 16, margin: "20px 0 8px" }}>Riwayat</p>

      <div className="chip-row">
        {([
          ["all", "Semua"],
          ["income", "Pemasukan"],
          ["expense", "Pengeluaran"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`chip ${typeFilter === value ? "active" : ""}`}
            onClick={() => changeTypeFilter(value)}
          >
            {typeFilter === value && <Check size={16} />}
            {label}
          </button>
        ))}
      </div>
      <select
        className="field-input"
        style={{ maxWidth: 200, marginTop: 8 }}
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
      >
        <option value="">Semua Kategori</option>
        {categoriesForFilter.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <div className="date-range">
        <label className="outlined-field">
          <span>Dari</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="outlined-field">
          <span>Sampai</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            className="icon-btn"
            aria-label="Bersihkan filter tanggal"
            title="Bersihkan filter tanggal"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>
      <div className="search-field">
        <Search size={20} />
        <input
          placeholder="Cari nama transaksi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button type="button" className="icon-btn" aria-label="Hapus pencarian" onClick={() => setSearch("")}>
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        {loading ? (
          <p className="empty-note">Memuat...</p>
        ) : filtered.length === 0 ? (
          <p className="empty-note">Belum ada transaksi.</p>
        ) : (
          filtered.map((t) => {
            const hasInvoice = !!t.invoiceUrl || localInvoiceIds.has(t.id);
            return (
              <div key={t.id} className="tx-row" onClick={() => startEdit(t)} role="button" tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && startEdit(t)}>
                {hasInvoice && (
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ color: "var(--primary-light)" }}
                    aria-label="Lihat invoice"
                    title="Lihat invoice"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewInvoice(t);
                    }}
                  >
                    <Receipt size={20} />
                  </button>
                )}
                <div className="tx-main">
                  <div className="tx-top">
                    <span className="stamp">{t.category.name}</span>
                    <span className="tx-name">{t.name}</span>
                  </div>
                  <p className="tx-meta">
                    {new Date(t.date).toLocaleDateString("id-ID")}
                    {t.account && ` · ${t.account.name}`}
                    {t.debt && ` · Bayar utang: ${t.debt.name}`}
                  </p>
                </div>
                <span className={`mono tx-amount ${t.type === "expense" ? "text-expense" : "text-income"}`}>
                  {t.type === "expense" ? "-" : "+"}
                  {rp(Number(t.amount))}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ color: "var(--coral)" }}
                  aria-label="Hapus transaksi"
                  title="Hapus"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(t.id);
                  }}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            );
          })
        )}
      </div>

      <button type="button" className="fab" onClick={openAdd} aria-label="Tambah transaksi" title="Tambah transaksi">
        <Plus size={28} />
      </button>

      {sheetOpen && (
        <>
          <div className="sheet-backdrop" onClick={closeSheet} />
          <form onSubmit={submit} className="sheet" role="dialog" aria-modal="true"
            aria-label={editingId ? "Ubah Transaksi" : "Tambah Transaksi"}>
            <div className="sheet-handle" />
            <p className="sheet-title">{editingId ? "Ubah Transaksi" : "Tambah Transaksi"}</p>

            {!editingId && (
              <div className="scan-box">
                <p className="scan-box-title">Scan Invoice (opsional)</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <label className={`btn-outline ${scanning ? "disabled" : ""}`}>
                    <Camera size={18} /> Ambil foto
                    <input type="file" accept="image/*" capture="environment" hidden disabled={scanning}
                      onChange={(e) => {
                        handleScan(e.target.files?.[0]);
                        e.target.value = "";
                      }} />
                  </label>
                  <label className={`btn-outline ${scanning ? "disabled" : ""}`}>
                    <ImageIcon size={18} /> Galeri
                    <input type="file" accept="image/*" hidden disabled={scanning}
                      onChange={(e) => {
                        handleScan(e.target.files?.[0]);
                        e.target.value = "";
                      }} />
                  </label>
                </div>
                {scanning && <p className="scan-note" style={{ color: "var(--primary)" }}>Membaca invoice…</p>}
                {scanNotice && !scanning && <p className="scan-note">{scanNotice}</p>}
                {invoiceFile && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span className="field-label" style={{ margin: 0 }}>Simpan foto invoice ini di mana?</span>
                      <button type="button" className="link-plain" style={{ fontSize: 11.5, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        onClick={() => { setInvoiceFile(null); setScanNotice(""); }}>
                        Batal lampirkan
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, marginTop: 6 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input type="radio" checked={invoiceStorage === "local"} onChange={() => setInvoiceStorage("local")} />
                        HP ini saja — tidak dikirim ke server, tapi tidak bisa dilihat dari device lain
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input type="radio" checked={invoiceStorage === "server"} onChange={() => setInvoiceStorage("server")} />
                        Server — bisa dilihat dari device lain
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="segmented">
              {([
                ["expense", "Pengeluaran"],
                ["income", "Pemasukan"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={type === value ? "active" : ""}
                  onClick={() => {
                    setType(value);
                    if (!categories.some((c) => c.id === categoryId && c.type === value)) {
                      setCategoryId(categories.find((c) => c.type === value)?.id || "");
                    }
                  }}
                >
                  {type === value && <Check size={16} />}
                  {label}
                </button>
              ))}
            </div>

            <CurrencyInput placeholder="Jumlah (Rp)" value={amount} onChange={setAmount} required />
            <input className="field-input" placeholder="Nama Transaksi (mis. Makan siang di warung Bu As)"
              value={name} onChange={(e) => setName(e.target.value)} required />

            <div>
              <div className="field-label-row">
                <label className="field-label">Kategori</label>
                <Link href="/settings/categories" className="section-head-link" style={{ fontSize: 11.5 }}>Kelola kategori →</Link>
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

            <label className="outlined-field">
              <span>Tanggal</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>

            <div>
              <div className="field-label-row">
                <label className="field-label">Akun kas/bank</label>
                <Link href="/accounts?tab=kas" className="section-head-link" style={{ fontSize: 11.5 }}>Kelola akun →</Link>
              </div>
              <select className="field-input" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                {accounts.length === 0 && <option value="">Belum ada akun</option>}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type}) — {rp(a.balance)}</option>
                ))}
              </select>
            </div>

            {type === "expense" && activeDebts.length > 0 && (
              <div>
                <label className="field-label">Kaitkan ke utang (opsional, mengurangi sisa utang)</label>
                <select className="field-input" value={debtId} onChange={(e) => setDebtId(e.target.value)}>
                  <option value="">Tidak dikaitkan</option>
                  {activeDebts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} — sisa {rp(Number(d.remainingAmount))}</option>
                  ))}
                </select>
              </div>
            )}

            <input className="field-input" placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />

            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={uploading || !accountId || !categoryId}>
              {uploading ? "Mengunggah invoice…" : editingId ? "Simpan Perubahan" : "Tambah"}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
