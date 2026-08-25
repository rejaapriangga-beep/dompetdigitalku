// app/header.tsx
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NavTabs } from "./nav-tabs";
import { ThemeToggle } from "./theme-toggle";

export async function Header() {
  const session = await auth();

  if (!session?.user) {
    return (
      <header className="app-header">
        <div className="app-header-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">D</span>
            <div>
              <p className="brand-title">DompetDigitalKu</p>
              <p className="brand-sub">Pengelolaan keuangan keluarga</p>
            </div>
          </Link>
          <div className="header-actions">
            <ThemeToggle />
            <Link href="/login" className="link-plain">Masuk</Link>
            <Link href="/register" className="btn btn-primary">Daftar</Link>
          </div>
        </div>
      </header>
    );
  }

  const userId = (session.user as { id: string }).id;
  const membership = await prisma.householdMember.findFirst({
    where: { userId },
    include: { household: true },
  });

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">D</span>
          <div>
            <p className="brand-title">DompetDigitalKu</p>
            <p className="brand-sub">{membership?.household.name || "Keluarga"}</p>
          </div>
        </Link>

        <NavTabs />

        <div className="header-actions">
          <ThemeToggle />
          <span className="profile-pill">{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="btn btn-secondary">Keluar</button>
          </form>
        </div>
      </div>
    </header>
  );
}
