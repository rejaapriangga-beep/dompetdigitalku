-- Pisahkan kategori Pemasukan dari Pengeluaran (2 tab di halaman Kelola
-- Kategori) lewat kolom "type" baru di Category.

-- 1) Tambah kolom "type", default 'expense' -- otomatis membackfill semua
--    kategori lama (semua kategori sebelum ini memang cuma dipakai untuk
--    pengeluaran, jadi default ini akurat untuk data yang sudah ada).
ALTER TABLE "Category" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'expense';

-- 2) Ganti unique constraint supaya nama yang sama boleh dipakai di kedua
--    tipe (mis. "Lainnya" versi Pemasukan dan versi Pengeluaran).
DROP INDEX "Category_householdId_name_key";
CREATE UNIQUE INDEX "Category_householdId_name_type_key" ON "Category"("householdId", "name", "type");

-- 3) Seed kategori Pemasukan default untuk tiap household yang sudah ada,
--    supaya tab Pemasukan langsung terisi tanpa harus setup manual dulu.
INSERT INTO "Category" ("id", "householdId", "name", "type")
SELECT gen_random_uuid()::text, h."id", c.name, 'income'
FROM "Household" h
CROSS JOIN (VALUES ('Gaji'), ('Bonus'), ('Lainnya')) AS c(name)
ON CONFLICT ("householdId", "name", "type") DO NOTHING;
