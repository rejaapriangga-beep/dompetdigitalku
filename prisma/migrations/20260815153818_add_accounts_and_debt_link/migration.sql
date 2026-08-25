-- 1. Tabel Account (akun kas/bank)
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Account" ADD CONSTRAINT "Account_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Kolom baru di Transaction (accountId sementara nullable, debtId opsional)
ALTER TABLE "Transaction" ADD COLUMN "accountId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "debtId" TEXT;

-- 3. Buat akun "Kas Utama" default untuk setiap rumah tangga yang sudah ada
-- (id dibuat pakai md5(random()) supaya tidak bergantung pada extension apa pun)
INSERT INTO "Account" ("id", "householdId", "name", "type", "createdAt")
SELECT md5(random()::text || clock_timestamp()::text || "id"), "id", 'Kas Utama', 'Tunai', CURRENT_TIMESTAMP
FROM "Household";

-- 4. Pindahkan transaksi lama ke akun "Kas Utama" milik household masing-masing
UPDATE "Transaction" t
SET "accountId" = a."id"
FROM "Account" a
WHERE a."householdId" = t."householdId" AND a."name" = 'Kas Utama' AND t."accountId" IS NULL;

-- 5. Wajibkan accountId sekarang semua baris sudah terisi
ALTER TABLE "Transaction" ALTER COLUMN "accountId" SET NOT NULL;

-- 6. Foreign keys
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Index
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");
CREATE INDEX "Transaction_debtId_idx" ON "Transaction"("debtId");
