// auth.ts (letakkan di root proyek, sejajar dengan package.json)
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { provisionGoogleUser } from "@/lib/oauth-provision";

// Hash dummy yang selalu dibandingkan kalau email tidak ditemukan, supaya
// waktu respons "email tidak ada" dan "email ada tapi password salah" mirip
// (mencegah orang menebak email terdaftar lewat selisih waktu respons).
const DUMMY_HASH = bcrypt.hashSync("dummy-password-untuk-keamanan-waktu-respons", 12);

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const ip = getClientIp(request.headers);

        // Batasi percobaan per email (cegah brute-force ke satu akun) dan
        // per IP (cegah satu penyerang mencoba banyak email sekaligus).
        if (!checkRateLimit(`login-email:${email}`, 5, 15 * 60 * 1000)) return null;
        if (!checkRateLimit(`login-ip:${ip}`, 20, 15 * 60 * 1000)) return null;

        const user = await prisma.user.findUnique({ where: { email } });

        // Selalu jalankan bcrypt.compare (pakai hash dummy kalau user tidak
        // ada) supaya waktu respons konsisten baik user ada maupun tidak.
        const valid = await bcrypt.compare(credentials.password as string, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Login Google: kalau email sudah terdaftar (mis. dulu daftar manual
      // pakai password), gabungkan ke akun yang sama — tidak bikin akun baru.
      // Kalau belum ada, buat User + Household baru (lihat lib/oauth-provision.ts).
      if (account?.provider === "google") {
        if (!user.email) return false;
        const dbUser = await provisionGoogleUser({ email: user.email, name: user.name || "" });
        user.id = dbUser.id;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.id = (user as { id: string }).id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { id?: string }).id =
          token.id as string;
      }
      return session;
    },
  },
});
