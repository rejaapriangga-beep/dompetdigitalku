// app/app-header.tsx
// AppBar + TopMenuBar, meniru lib/screens/*_screen.dart + lib/widgets/
// top_menu_bar.dart di app Android: judul halaman di AppBar (dengan tombol
// kembali di selain Beranda), lalu baris 5 menu utama di bawahnya.
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  Home,
  LogOut,
  PieChart,
  UserCog,
  Wallet,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const MENU = [
  { href: "/", label: "Beranda", icon: Home, color: "var(--sky)" },
  { href: "/dashboard", label: "Transaksi", icon: ArrowLeftRight, color: "var(--primary)" },
  { href: "/accounts", label: "Aset, Investasi & Utang", icon: Wallet, color: "var(--gold)" },
  { href: "/budgets", label: "Anggaran", icon: PieChart, color: "var(--plum)" },
  { href: "/health", label: "Laporan", icon: BarChart3, color: "var(--teal)" },
];

const TITLES: Record<string, string> = {
  "/": "Beranda",
  "/dashboard": "Transaksi",
  "/accounts": "Aset & Utang",
  "/budgets": "Anggaran Bulanan",
  "/health": "Laporan",
  "/debts": "Utang & Cicilan",
  "/investments": "Investasi",
  "/settings/categories": "Kategori Transaksi",
  "/settings/account": "Akun Saya",
  "/delete-account": "Hapus Akun",
  "/privacy": "Kebijakan Privasi",
  "/terms": "Syarat & Ketentuan",
  "/login": "Masuk",
  "/register": "Daftar",
};

// Halaman "induk" untuk tombol kembali kalau tidak ada riwayat navigasi
// (mis. halaman dibuka langsung dari bookmark).
const PARENT: Record<string, string> = {
  "/debts": "/accounts",
  "/investments": "/accounts",
  "/settings/categories": "/budgets",
  "/delete-account": "/settings/account",
};

export function AppHeader({
  loggedIn,
  logoutAction,
}: {
  loggedIn: boolean;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isMenuPage = MENU.some((m) => m.href === pathname);
  const isHome = pathname === "/";
  const title = !loggedIn && isHome ? "DompetDigitalKu" : (TITLES[pathname] ?? "DompetDigitalKu");

  const goBack = () => {
    if (isMenuPage) return router.push("/");
    if (window.history.length > 1) return router.back();
    router.push(PARENT[pathname] ?? "/");
  };

  const logoutButton = (
    <form action={logoutAction}>
      <button type="submit" className="appbar-icon" aria-label="Keluar" title="Keluar">
        <LogOut size={22} />
      </button>
    </form>
  );

  let actions: React.ReactNode = null;
  if (!loggedIn) {
    actions = (
      <>
        <ThemeToggle />
        <Link href="/login" className="appbar-text-action">Masuk</Link>
      </>
    );
  } else if (isHome) {
    actions = (
      <>
        <ThemeToggle />
        <Link href="/settings/account" className="appbar-icon" aria-label="Akun Saya" title="Akun Saya">
          <UserCog size={22} />
        </Link>
        {logoutButton}
      </>
    );
  } else if (pathname === "/dashboard") {
    actions = logoutButton;
  } else if (pathname === "/budgets") {
    actions = <Link href="/settings/categories" className="appbar-text-action">Kelola kategori →</Link>;
  }

  return (
    <header className="app-header">
      <div className="app-shell">
        <div className="appbar">
          {loggedIn && !isHome && (
            <button type="button" className="appbar-icon" onClick={goBack} aria-label="Kembali">
              <ArrowLeft size={24} />
            </button>
          )}
          <h1 className="appbar-title">{title}</h1>
          <div className="appbar-actions">{actions}</div>
        </div>
        {loggedIn && isMenuPage && (
          <nav className="top-menu" aria-label="Menu utama">
            {MENU.map((m) => {
              const Icon = m.icon;
              const active = m.href === pathname;
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className="top-menu-item"
                  aria-current={active ? "page" : undefined}
                  style={{
                    color: m.color,
                    background: `color-mix(in srgb, ${m.color} ${active ? 26 : 14}%, transparent)`,
                  }}
                >
                  <Icon size={22} />
                  <span>{m.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
