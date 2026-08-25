// app/nav-tabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Home,
  ArrowLeftRight,
  Wallet,
  BarChart3,
  MoreHorizontal,
  PiggyBank,
  Target as TargetIcon,
  TrendingUp,
  CreditCard,
  HeartPulse,
  Settings,
  UserCog,
} from "lucide-react";

const ICON_SIZE = 22;

const TABS = [
  { href: "/", label: "Beranda" },
  { href: "/dashboard", label: "Transaksi" },
  { href: "/accounts", label: "Aset & Utang" },
  { href: "/budgets", label: "Anggaran" },
  { href: "/goals", label: "Target" },
  { href: "/investments", label: "Investasi" },
  { href: "/debts", label: "Utang" },
  { href: "/reports", label: "Laporan" },
  { href: "/health", label: "Kesehatan Keuangan" },
  { href: "/settings/categories", label: "Kategori" },
  { href: "/settings/account", label: "Akun Saya" },
];

// Item utama di tab bar bawah (mobile) — dipilih yang paling sering dipakai.
const BOTTOM_TABS = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/dashboard", label: "Transaksi", icon: ArrowLeftRight },
  { href: "/accounts", label: "Aset", icon: Wallet },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
];

// Sisanya masuk ke sheet "Lainnya" (pola umum iOS saat item nav > 5).
const MORE_ITEMS = [
  { href: "/budgets", label: "Anggaran", icon: PiggyBank },
  { href: "/goals", label: "Target Menabung", icon: TargetIcon },
  { href: "/investments", label: "Investasi", icon: TrendingUp },
  { href: "/debts", label: "Utang & Cicilan", icon: CreditCard },
  { href: "/health", label: "Kesehatan Keuangan", icon: HeartPulse },
  { href: "/settings/categories", label: "Kategori Transaksi", icon: Settings },
  { href: "/settings/account", label: "Akun Saya", icon: UserCog },
];

export function NavTabs() {
  const pathname = usePathname();
  // moreOpen mengontrol apakah sheet ADA di DOM sama sekali — dijaga supaya
  // saat tertutup, elemen ini benar-benar tidak ikut dirender (tidak bisa
  // menutupi konten lain, apa pun ukuran/posisi viewport-nya).
  const [moreOpen, setMoreOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  // Di-portal ke document.body — kalau tidak, position:fixed-nya jadi
  // relatif ke <header> (yang punya backdrop-filter), bukan ke layar.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isMoreActive = MORE_ITEMS.some((m) => m.href === pathname);

  const openMore = () => {
    setMoreOpen(true);
    setSheetVisible(true);
  };
  const closeMore = () => {
    setSheetVisible(false);
    setTimeout(() => setMoreOpen(false), 220);
  };

  return (
    <>
      {/* Tampilan desktop: tab horizontal seperti sebelumnya */}
      <nav className="nav-tabs nav-tabs-desktop">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={`nav-tab ${pathname === t.href ? "active" : ""}`}>
            {t.label}
          </Link>
        ))}
      </nav>

      {/* Tampilan mobile: tab bar bawah ala iOS + sheet "Lainnya" — di-portal
          ke document.body supaya position:fixed-nya relatif ke layar sungguhan. */}
      {mounted &&
        createPortal(
          <>
            <nav className="bottom-tab-bar">
              {BOTTOM_TABS.map((t) => {
                const Icon = t.icon;
                const active = pathname === t.href;
                return (
                  <Link key={t.href} href={t.href} className={`bottom-tab-item ${active ? "active" : ""}`}>
                    <Icon size={ICON_SIZE} strokeWidth={active ? 2.4 : 2} />
                    {t.label}
                  </Link>
                );
              })}
              <button
                type="button"
                className={`bottom-tab-item ${isMoreActive ? "active" : ""}`}
                onClick={openMore}
              >
                <MoreHorizontal size={ICON_SIZE} strokeWidth={isMoreActive ? 2.4 : 2} />
                Lainnya
              </button>
            </nav>

            {moreOpen && (
              <>
                <div className={`more-sheet-backdrop ${sheetVisible ? "open" : ""}`} onClick={closeMore} />
                <div className={`more-sheet ${sheetVisible ? "open" : ""}`}>
                  <div className="more-sheet-handle" />
                  <div className="nav-mobile-menu open">
                    {MORE_ITEMS.map((t) => {
                      const Icon = t.icon;
                      return (
                        <Link
                          key={t.href}
                          href={t.href}
                          className={`nav-tab ${pathname === t.href ? "active" : ""}`}
                          onClick={closeMore}
                          style={{ display: "flex", alignItems: "center", gap: 10 }}
                        >
                          <Icon size={18} />
                          {t.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>,
          document.body
        )}
    </>
  );
}
