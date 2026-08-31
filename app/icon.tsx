// app/icon.tsx
// Favicon aplikasi — dibuat langsung dari kode (bukan file gambar statis)
// supaya warnanya selalu konsisten dengan token warna di globals.css.
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#E8631C", // var(--primary)
          borderRadius: 7,
          color: "#fff",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
        }}
      >
        D
      </div>
    ),
    { ...size }
  );
}
