// app/local-invoice-store.ts
// Penyimpanan invoice 100% lokal di HP/browser (IndexedDB) — tidak pernah
// terkirim ke server sama sekali. Trade-off: tidak bisa dilihat dari device
// lain, dan bisa hilang kalau data browser/PWA dihapus (bawaan browser).
const DB_NAME = "buku-keuangan-local-invoices";
const STORE_NAME = "invoices";

type StoredInvoice = { blob: Blob; fileName: string; contentType: string; savedAt: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalInvoice(transactionId: string, file: File): Promise<void> {
  // Best-effort minta browser tidak menghapus storage ini duluan saat low-disk.
  // Tidak dijamin (kebijakan tiap browser beda), tapi mengurangi risikonya.
  if (navigator.storage?.persist) {
    try {
      await navigator.storage.persist();
    } catch {
      // abaikan — bukan fatal kalau gagal/tidak didukung
    }
  }

  const db = await openDb();
  const record: StoredInvoice = { blob: file, fileName: file.name, contentType: file.type, savedAt: Date.now() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record, transactionId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getLocalInvoice(transactionId: string): Promise<StoredInvoice | null> {
  const db = await openDb();
  const result = await new Promise<StoredInvoice | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(transactionId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function deleteLocalInvoice(transactionId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(transactionId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Cek banyak id sekaligus (dipakai saat render daftar transaksi) -> Set id yang punya invoice lokal. */
export async function getLocalInvoiceIds(transactionIds: string[]): Promise<Set<string>> {
  if (transactionIds.length === 0) return new Set();
  const db = await openDb();
  const found = new Set<string>();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    let remaining = transactionIds.length;
    for (const id of transactionIds) {
      const req = store.getKey(id);
      req.onsuccess = () => {
        if (req.result !== undefined) found.add(id);
        remaining -= 1;
        if (remaining === 0) resolve();
      };
      req.onerror = () => reject(req.error);
    }
  });
  db.close();
  return found;
}
