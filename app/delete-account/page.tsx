// app/delete-account/page.tsx
// Halaman publik (tidak perlu login) yang menjelaskan cara menghapus akun —
// dipersyaratkan Google Play (Data Safety form, "Account deletion URL") agar
// reviewer bisa mengaksesnya tanpa harus login. Alur hapus akun yang
// sesungguhnya tetap di app/settings/account/page.tsx (butuh login).
import Link from "next/link";

export const metadata = {
  title: "Hapus Akun — DompetDigitalKu",
};

export default function DeleteAccountPage() {
  return (
    <main className="page-main" style={{ maxWidth: 760 }}>
      <p className="page-title" style={{ fontSize: 26 }}>Hapus Akun</p>

      <div className="panel">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Anda dapat meminta penghapusan akun DompetDigitalKu beserta seluruh data rumah tangga Anda kapan saja,
          baik lewat aplikasi (web atau mobile) maupun lewat email.
        </p>
      </div>

      <div className="panel">
        <p className="panel-title">Cara 1 — Lewat Aplikasi (jika masih bisa login)</p>
        <ol style={{ margin: "0 0 6px", paddingLeft: 20, lineHeight: 1.8, fontSize: 14 }}>
          <li>
            Masuk ke akun Anda, lalu buka halaman{" "}
            <Link href="/settings/account" className="link-plain">Akun Saya</Link>
            {" "}(web) atau menu <strong>Bantuan → Hapus Akun</strong> (aplikasi mobile).
          </li>
          <li>Pada bagian <strong>Zona Berbahaya</strong>, ketik <strong>HAPUS</strong> pada kolom konfirmasi.</li>
          <li>Tekan tombol <strong>Hapus Akun &amp; Semua Data</strong>.</li>
        </ol>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>
          Penghapusan berlaku langsung dan permanen setelah dikonfirmasi.
        </p>
      </div>

      <div className="panel">
        <p className="panel-title">Cara 2 — Lewat Email (jika tidak bisa login)</p>
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Kirim email permintaan penghapusan akun ke{" "}
          <a href="mailto:privacy@dompetdigitalku.my.id" className="link-plain">privacy@dompetdigitalku.my.id</a>
          {" "}dari alamat email yang terdaftar di akun Anda. Kami akan memproses permintaan Anda paling lambat
          dalam waktu yang wajar.
        </p>
      </div>

      <div className="panel" style={{ borderColor: "var(--coral)" }}>
        <p className="panel-title" style={{ color: "var(--coral)" }}>Data yang Dihapus</p>
        <p style={{ lineHeight: 1.7, fontSize: 14, marginBottom: 10 }}>
          Menghapus akun akan menghapus secara permanen <strong>seluruh data rumah tangga</strong> Anda, meliputi:
        </p>
        <ul style={{ margin: "0 0 10px", paddingLeft: 20, lineHeight: 1.8, fontSize: 14 }}>
          <li>Profil akun (nama, email)</li>
          <li>Seluruh transaksi, kategori, dan anggaran bulanan</li>
          <li>Akun kas/bank, aset tetap, dan investasi</li>
          <li>Utang &amp; cicilan</li>
          <li>Foto struk/invoice yang disimpan di mode &quot;Server&quot;</li>
        </ul>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>
          Jika rumah tangga Anda memiliki anggota lain, data mereka ikut terhapus juga — hubungi{" "}
          <a href="mailto:privacy@dompetdigitalku.my.id" className="link-plain">privacy@dompetdigitalku.my.id</a>
          {" "}terlebih dahulu sebelum menghapus akun bersama.
        </p>
      </div>

      <p style={{ marginTop: 24, fontSize: 12.5 }}>
        <Link href="/privacy" className="link-plain">Lihat Kebijakan Privasi →</Link>
      </p>
    </main>
  );
}
