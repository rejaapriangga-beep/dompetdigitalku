// app/header.tsx
import { auth, signOut } from "@/auth";
import { AppHeader } from "./app-header";

export async function Header() {
  const session = await auth();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return <AppHeader loggedIn={!!session?.user} logoutAction={logout} />;
}
