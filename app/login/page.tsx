// app/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Status = { type: "idle" | "loading" | "error"; message?: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "loading" });
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setStatus({ type: "error", message: "Email atau password salah." });
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <p className="panel-title" style={{ fontSize: 19, marginBottom: 4 }}>Masuk</p>
        <p style={{ color: "var(--ink-soft)", fontSize: 12.5, marginBottom: 18 }}>Lanjutkan ke DompetDigitalKu</p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label className="field-label">Email</label>
            <input className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Password</label>
            <input className="field-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={status.type === "loading"}>
            {status.type === "loading" ? "Memproses..." : "Masuk"}
          </button>
          {status.type === "error" && <p className="form-error">{status.message}</p>}
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>atau</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="btn btn-secondary btn-block"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5c-2 1.4-4.6 2.3-7.5 2.3-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.5 5.5C41.4 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z" />
          </svg>
          Masuk dengan Google
        </button>
        <p style={{ fontSize: 11, marginTop: 10, textAlign: "center", color: "var(--ink-soft)", lineHeight: 1.5 }}>
          Dengan masuk/mendaftar lewat Google, Anda menyetujui{" "}
          <Link href="/privacy" className="link-plain" target="_blank">Kebijakan Privasi</Link>{" "}
          dan{" "}
          <Link href="/terms" className="link-plain" target="_blank">Syarat &amp; Ketentuan</Link>{" "}
          kami.
        </p>

        <p style={{ fontSize: 12.5, marginTop: 16, textAlign: "center", color: "var(--ink-soft)" }}>
          Belum punya akun? <Link href="/register" className="link-plain">Daftar</Link>
        </p>
      </div>
    </main>
  );
}
