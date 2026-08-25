// app/api/uploads/view/route.ts
// Mengalihkan (redirect) ke URL baca sementara dari R2 untuk sebuah key,
// setelah memastikan key itu memang milik household yang sedang login.
// Bucket R2 tetap privat — tidak ada foto invoice yang publik.
import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "@/lib/r2";
import { getCurrentHousehold } from "@/lib/current-household";

export async function GET(request: Request) {
  const ctx = await getCurrentHousehold(request);
  if (!ctx) return NextResponse.json({ error: "Belum masuk atau tidak punya rumah tangga." }, { status: 401 });

  const key = new URL(request.url).searchParams.get("key");
  if (!key || !key.startsWith(`invoices/${ctx.householdId}/`)) {
    return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  }

  const viewUrl = await getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), { expiresIn: 300 });
  return NextResponse.redirect(viewUrl);
}
