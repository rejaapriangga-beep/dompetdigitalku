-- Tambah kategori transaksi terkelola (menu Setting), ganti field bebas-ketik
-- "category" di Transaction jadi "name" (Nama Transaksi) + "categoryId" (FK),
-- dan pindahkan Budget dari kategori-teks ke categoryId juga supaya Anggaran
-- Bulanan otomatis mengikuti daftar kategori yang sama (bukan daftar terpisah).

-- 1) Tabel Category
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_householdId_name_key" ON "Category"("householdId", "name");
CREATE INDEX "Category_householdId_idx" ON "Category"("householdId");
ALTER TABLE "Category" ADD CONSTRAINT "Category_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) Seed kategori default (8 kategori lama dari Anggaran, termasuk "Lainnya")
--    untuk setiap household yang sudah ada, supaya nama Budget lama bisa
--    dipetakan langsung ke Category baru dengan nama yang sama persis.
INSERT INTO "Category" ("id", "householdId", "name")
SELECT gen_random_uuid()::text, h."id", c.name
FROM "Household" h
CROSS JOIN (VALUES ('Makanan'), ('Transport'), ('Belanja'), ('Hiburan'), ('Tagihan'), ('Kesehatan'), ('Pendidikan'), ('Lainnya')) AS c(name)
ON CONFLICT ("householdId", "name") DO NOTHING;

-- 3) Transaction: tambah "name" (Nama Transaksi) + "categoryId", backfill dari
--    kolom "category" lama (teks bebas -> jadi Nama Transaksi apa adanya,
--    kategori diarahkan ke "Lainnya" sebagai default aman).
ALTER TABLE "Transaction" ADD COLUMN "name" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "categoryId" TEXT;

UPDATE "Transaction" SET "name" = "category" WHERE "name" IS NULL;

UPDATE "Transaction" t
SET "categoryId" = c."id"
FROM "Category" c
WHERE c."householdId" = t."householdId" AND c."name" = 'Lainnya' AND t."categoryId" IS NULL;

ALTER TABLE "Transaction" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "Transaction" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Transaction" DROP COLUMN "category";
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

-- 4) Budget: ganti "category" (teks) jadi "categoryId" (FK), petakan lewat
--    nama yang sama persis dari kategori default yang sudah di-seed di atas.
ALTER TABLE "Budget" ADD COLUMN "categoryId" TEXT;

UPDATE "Budget" b
SET "categoryId" = c."id"
FROM "Category" c
WHERE c."householdId" = b."householdId" AND c."name" = b."category" AND b."categoryId" IS NULL;

-- Jaga-jaga: kalau ada nama kategori anggaran lama yang tidak cocok (seharusnya
-- tidak terjadi karena sudah di-seed persis di atas), arahkan ke "Lainnya".
UPDATE "Budget" b
SET "categoryId" = c."id"
FROM "Category" c
WHERE c."householdId" = b."householdId" AND c."name" = 'Lainnya' AND b."categoryId" IS NULL;

ALTER TABLE "Budget" DROP CONSTRAINT IF EXISTS "Budget_householdId_category_key";
ALTER TABLE "Budget" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Budget" DROP COLUMN "category";
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Budget_householdId_categoryId_key" ON "Budget"("householdId", "categoryId");
