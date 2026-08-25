// app/currency-input.tsx
"use client";

// Input angka dengan pemisah ribuan otomatis ala Indonesia (mis. "5.000.000")
// selagi mengetik. Nilai yang dikirim ke parent (lewat onChange) tetap angka
// mentah tanpa titik, jadi tidak perlu ubah logika submit di mana pun dipakai.
//
// Ada 2 mode, bisa dipilih lewat ikon di kanan input:
// - Numerik (default): ketik angka biasa, langsung diformat pemisah ribuan.
// - Kalkulator: ketik ekspresi (mis. "15000+25000+8000") untuk menjumlahkan
//   beberapa struk/pos sekaligus — berguna waktu input belanja pasar yang
//   itemnya banyak. Hasilnya otomatis dihitung saat keluar dari field
//   (blur), lalu field kembali ke tampilan angka biasa.
import { useState } from "react";
import { Calculator, Hash } from "lucide-react";
import { evaluateExpression } from "./calc-eval";

type Props = {
  value: string;
  onChange: (rawDigits: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function CurrencyInput({ value, onChange, onBlur, placeholder, required, className = "field-input", style }: Props) {
  const [calcMode, setCalcMode] = useState(false);
  const [calcExpr, setCalcExpr] = useState("");

  const display = value ? Number(value).toLocaleString("id-ID") : "";
  const calcResult = calcMode ? evaluateExpression(calcExpr) : null;

  function toggleMode() {
    if (calcMode) {
      // Balik ke mode numerik: kalau ada ekspresi valid yang belum
      // di-submit (belum sempat blur), terapkan dulu hasilnya.
      if (calcResult !== null && calcResult >= 0) onChange(String(Math.round(calcResult)));
      setCalcExpr("");
    } else {
      setCalcExpr(value ? Number(value).toLocaleString("id-ID") : "");
    }
    setCalcMode(!calcMode);
  }

  function handleCalcBlur() {
    if (calcResult !== null && calcResult >= 0) {
      onChange(String(Math.round(calcResult)));
    }
    setCalcMode(false);
    setCalcExpr("");
    onBlur?.();
  }

  return (
    <div style={{ position: "relative" }}>
      {calcMode ? (
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          autoFocus
          className={className}
          style={{ ...style, paddingRight: 46 }}
          placeholder="mis. 15000+25000+8000"
          value={calcExpr}
          onChange={(e) => setCalcExpr(e.target.value.replace(/[^0-9+\-*/×÷x().\s]/gi, ""))}
          onBlur={handleCalcBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCalcBlur();
            }
          }}
        />
      ) : (
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className={className}
          style={{ ...style, paddingRight: 46 }}
          placeholder={placeholder}
          required={required}
          value={display}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          onBlur={onBlur}
        />
      )}
      <button
        type="button"
        onClick={toggleMode}
        title={calcMode ? "Ganti ke input angka biasa" : "Ganti ke mode kalkulator (jumlahkan beberapa angka)"}
        style={{
          position: "absolute",
          right: 6,
          top: "50%",
          transform: "translateY(-50%)",
          width: 34,
          height: 34,
          border: "none",
          background: "transparent",
          color: "var(--ink-soft)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
        }}
      >
        {calcMode ? <Hash size={22} /> : <Calculator size={22} />}
      </button>
      {calcMode && (
        <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: "4px 0 0" }}>
          {calcExpr.trim() === ""
            ? "Ketik penjumlahan, mis. 15000+25000+8000 — Enter/klik di luar untuk hitung."
            : calcResult !== null && calcResult >= 0
              ? `= Rp${Math.round(calcResult).toLocaleString("id-ID")}`
              : "Ekspresi belum lengkap/valid."}
        </p>
      )}
    </div>
  );
}
