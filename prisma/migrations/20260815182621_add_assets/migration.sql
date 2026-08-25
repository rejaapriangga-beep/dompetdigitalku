-- Tabel Asset (aset tetap/fisik: rumah, mobil, dll — nilai diisi manual)
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currentValue" DECIMAL(14,2) NOT NULL,
    "acquisitionValue" DECIMAL(14,2),
    "acquisitionDate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Asset" ADD CONSTRAINT "Asset_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
