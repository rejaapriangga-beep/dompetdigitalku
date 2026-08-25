// app/register/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Status = { type: "idle" | "loading" | "success" | "error"; message?: string };

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setStatus({ type: "error", message: "Anda harus menyetujui Kebijakan Privasi & Syarat Ketentuan untuk mendaftar." });
      return;
    }
    setStatus({ type: "loading" });
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, householdName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", message: data.error || "Gagal mendaftar." });
        return;
      }
      setStatus({ type: "success", message: "Registrasi berhasil! Mengarahkan ke halaman masuk..." });
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      setStatus({ type: "error", message: "Gagal terhubung ke server." });
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <p className="panel-title" style={{ fontSize: 19, marginBottom: 4 }}>Daftar</p>
        <p style={{ color: "var(--ink-soft)", fontSize: 12.5, marginBottom: 18 }}>Buat akun & rumah tangga baru</p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label className="field-label">Nama kamu</label>
            <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Nama keluarga</label>
            <input className="field-input" placeholder="mis. Keluarga Budi" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Password</label>
            <input className="field-input" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--ink-soft)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              Saya menyetujui{" "}
              <Link href="/privacy" className="link-plain" target="_blank">Kebijakan Privasi</Link>{" "}
              dan{" "}
              <Link href="/terms" className="link-plain" target="_blank">Syarat &amp; Ketentuan</Link>{" "}
              DompetDigitalKu.
            </span>
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={status.type === "loading"}>
            {status.type === "loading" ? "Memproses..." : "Daftar"}
          </button>
          {status.type === "success" && <p className="form-success">{status.message}</p>}
          {status.type === "error" && <p className="form-error">{status.message}</p>}
        </form>
        <p style={{ fontSize: 12.5, marginTop: 16, textAlign: "center", color: "var(--ink-soft)" }}>
          Sudah punya akun? <Link href="/login" className="link-plain">Masuk</Link>
        </p>
      </div>
    </main>
  );
}
