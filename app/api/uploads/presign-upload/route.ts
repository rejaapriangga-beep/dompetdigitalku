// app/api/uploads/presign-upload/route.ts
// Menyiapkan URL upload langsung ke Cloudflare R2 (browser -> R2, tidak lewat
// server kita) supaya foto invoice tidak pernah membebani disk/memori VPS.
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "@/lib/r2";
import { getCurrentHousehold } from "@/lib/current-household";

export async function POST(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  try {
    const { fileName, contentType, fileSize } = await request.json();

    if (!contentType || !contentType.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar (foto invoice)." }, { status: 400 });
    }
    if (typeof fileSize === "number" && fileSize > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran foto invoice maksimal 10MB." }, { status: 400 });
    }

    const safeName = String(fileName || "invoice").replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `invoices/${ctx.householdId}/${Date.now()}-${safeName}`;

    const uploadUrl = await getSignedUrl(
      r2,
      new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
      { expiresIn: 300 }
    );

    return NextResponse.json({ uploadUrl, key });
  } catch (err) {
    console.error("Presign upload error:", err);
    return NextResponse.json({ error: "Gagal menyiapkan unggahan." }, { status: 500 });
  }
}
