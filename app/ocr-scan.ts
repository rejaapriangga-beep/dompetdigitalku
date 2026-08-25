// app/ocr-scan.ts
// OCR invoice 100% di browser (Tesseract.js, jalan di Web Worker) — foto TIDAK
// PERNAH dikirim ke server kita, dan tidak pernah disimpan. Cuma teks hasil
// baca yang diproses sebentar di memori untuk mengisi form, lalu dibuang.
// Prinsip: hasil OCR TIDAK PERNAH dipakai otomatis tanpa user memeriksa &
// mengonfirmasi — cuma untuk PRE-FILL form, bukan auto-submit.
import { createWorker } from "tesseract.js";

export type ScanResult = {
  rawText: string;
  amount: string | null; // digit mentah, siap dipakai CurrencyInput
  date: string | null; // format YYYY-MM-DD, siap dipakai <input type="date">
  vendor: string | null;
};

const MONTHS: Record<string, string> = {
  januari: "01", februari: "02", maret: "03", april: "04",
  mei: "05", juni: "06", juli: "07", agustus: "08",
  september: "09", oktober: "10", november: "11", desember: "12",
};

function toDigits(numStr: string): string {
  // "150.000,00" / "150,000.00" / "150.000" -> "150000" (buang desimal & pemisah)
  const cleaned = numStr.replace(/\s/g, "");
  // Kalau ada 2 pemisah berbeda (mis. "1.234,56"), yang paling kanan = desimal.
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  const decimalSepIdx = Math.max(lastDot, lastComma);
  let integerPart = cleaned;
  if (decimalSepIdx > -1 && cleaned.length - decimalSepIdx <= 3) {
    integerPart = cleaned.slice(0, decimalSepIdx);
  }
  return integerPart.replace(/\D/g, "");
}

// Batas nilai wajar untuk transaksi ritel (di bawah Rp1 miliar) — dipakai
// untuk menyaring nomor invoice/barcode/HP yang salah tertangkap sebagai
// "jumlah" (deretan digit panjang biasanya JAUH di atas nilai transaksi wajar).
const MAX_PLAUSIBLE_AMOUNT = 999_999_999;

function extractAmount(text: string): string | null {
  const lines = text.split("\n");
  const numberPattern = /(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d{4,})/g;
  const groupedPattern = /\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?/g; // angka berpemisah ribuan, mis. "150.000"
  const keywordPattern = /\b(grand\s*total|total\s*tagihan|total\s*bayar|total\s*belanja|total|jumlah\s*bayar|jumlah)\b/i;
  // Baris-baris ini SERING mengandung kata "total"/"jumlah" tapi bukan total
  // akhir invoice — melainkan subtotal per-item, ongkos kirim, potongan, dsb.
  // yang bisa lebih besar dari total akhir setelah diskon/voucher.
  const excludePattern =
    /\b(subtotal|sub\s*total|total\s*harga|harga\s*satuan|ongkos\s*kirim|ongkir|voucher|diskon|discount|asuransi|biaya|kembali|change|tunai|cash)\b/i;

  const candidates: number[] = [];
  for (const line of lines) {
    if (!keywordPattern.test(line) || excludePattern.test(line)) continue;
    const matches = line.match(numberPattern);
    if (!matches) continue;
    for (const m of matches) {
      const digits = toDigits(m);
      if (digits && digits.length >= 3) {
        const n = Number(digits);
        if (n <= MAX_PLAUSIBLE_AMOUNT) candidates.push(n);
      }
    }
  }
  // Total akhir biasanya dicetak PALING TERAKHIR di struk/invoice (setelah
  // rincian subtotal/ongkir/diskon dihitung) — ambil kandidat paling akhir,
  // BUKAN yang terbesar, supaya subtotal sebelum diskon tidak salah terpilih.
  if (candidates.length > 0) return String(candidates[candidates.length - 1]);

  // Fallback: prioritaskan angka berpemisah ribuan (cara umum harga dicetak)
  // supaya nomor invoice/HP/barcode (biasanya deretan digit TANPA pemisah)
  // tidak ikut kena.
  const groupedMatches = text.match(groupedPattern);
  if (groupedMatches) {
    const groupedNums = groupedMatches
      .map((m) => Number(toDigits(m)))
      .filter((n) => n >= 100 && n <= MAX_PLAUSIBLE_AMOUNT);
    if (groupedNums.length > 0) return String(groupedNums[groupedNums.length - 1]);
  }

  // Fallback terakhir: angka mentah tanpa pemisah, tetap dibatasi nilai wajar.
  const allMatches = text.match(numberPattern);
  if (!allMatches) return null;
  const allNums = allMatches.map((m) => Number(toDigits(m))).filter((n) => n >= 100 && n <= MAX_PLAUSIBLE_AMOUNT);
  if (allNums.length === 0) return null;
  return String(allNums[allNums.length - 1]);
}

function extractDate(text: string): string | null {
  const slashMatch = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (slashMatch) {
    let [, d, m, y] = slashMatch;
    if (y.length === 2) y = `20${y}`;
    const dd = d.padStart(2, "0");
    const mm = m.padStart(2, "0");
    if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) {
      return `${y}-${mm}-${dd}`;
    }
  }

  const namedMatch = text.match(
    /(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})/i
  );
  if (namedMatch) {
    const [, d, monthName, y] = namedMatch;
    const mm = MONTHS[monthName.toLowerCase()];
    if (mm) return `${y}-${mm}-${d.padStart(2, "0")}`;
  }

  return null;
}

function extractVendor(text: string): string | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 3 && /[a-zA-Z]/.test(l));
  return lines[0] || null;
}

export async function scanInvoiceImage(file: File): Promise<ScanResult> {
  const worker = await createWorker("ind+eng");
  try {
    const { data } = await worker.recognize(file);
    const rawText = data.text || "";
    return {
      rawText,
      amount: extractAmount(rawText),
      date: extractDate(rawText),
      vendor: extractVendor(rawText),
    };
  } finally {
    await worker.terminate();
  }
}
