// lib/prisma.ts
// Prisma 7 mewajibkan "driver adapter" eksplisit untuk terhubung ke database —
// tidak lagi otomatis membaca DATABASE_URL di dalam PrismaClient seperti versi sebelumnya.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

const adapter = new PrismaPg({ connectionString });

// Pola singleton — mencegah banyak koneksi database dibuat ulang tiap kali
// Next.js melakukan hot-reload saat development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
