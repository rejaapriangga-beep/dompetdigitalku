// app/privacy/page.tsx
// Kebijakan Privasi — disusun berdasarkan data yang benar-benar dikumpulkan
// dan diproses oleh DompetDigitalKu (bukan template generik), untuk
// memenuhi kewajiban UU No. 27/2022 (PDP) Pasal 20 dan syarat wajib
// Google Play (Data Safety / Privacy Policy URL).
import Link from "next/link";

export const metadata = {
  title: "Kebijakan Privasi — DompetDigitalKu",
};

export default function PrivacyPage() {
  return (
    <main className="page-main" style={{ maxWidth: 760 }}>
      <p className="page-title" style={{ fontSize: 26 }}>Kebijakan Privasi</p>
      <p style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 24 }}>
        Berlaku sejak: 21 Agustus 2026 &middot; Terakhir diperbarui: 21 Agustus 2026
      </p>

      <div className="panel">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          DompetDigitalKu ("<strong>Aplikasi</strong>", "kami") adalah aplikasi pencatatan keuangan keluarga yang
          dikelola oleh <strong>MangJaja</strong> sebagai pengembang perorangan ("<strong>Pengendali Data</strong>"),
          berkedudukan di Indonesia. Kebijakan Privasi ini menjelaskan data pribadi apa yang kami kumpulkan, untuk
          apa, kepada siapa dibagikan, dan hak Anda sebagai pengguna, sesuai dengan Undang-Undang No. 27 Tahun 2022
          tentang Pelindungan Data Pribadi ("<strong>UU PDP</strong>").
        </p>
      </div>

      <Section title="1. Data yang Kami Kumpulkan">
        <SubTitle>a. Data yang Anda berikan langsung</SubTitle>
        <List items={[
          "Nama, alamat email, dan kata sandi — saat mendaftar akun secara manual.",
          "Nama dan alamat email — saat masuk menggunakan \"Masuk dengan Google\" (diterima dari Google, lihat bagian 3).",
          "Data keuangan yang Anda catat sendiri: transaksi (jumlah, nama, kategori, tanggal, catatan), akun kas/bank, aset tetap, investasi, utang & cicilan, dan anggaran bulanan.",
          "Foto struk/invoice belanja — bersifat opsional, hanya jika Anda memilih fitur pindai struk.",
        ]} />
        <SubTitle>b. Data teknis yang terekam otomatis</SubTitle>
        <List items={[
          "Alamat IP — digunakan sesaat untuk mencegah percobaan masuk/daftar berulang (brute-force), tidak disimpan permanen terkait identitas Anda.",
          "Info perangkat (jenis perangkat) untuk sesi login aplikasi mobile — agar Anda bisa mengelola atau mencabut akses per perangkat.",
        ]} />
      </Section>

      <Section title="2. Fitur Pindai Struk (OCR) — Diproses di Perangkat Anda">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Saat Anda memotret struk belanja, pembacaan teks (jumlah, tanggal, nama toko) dilakukan{" "}
          <strong>sepenuhnya di dalam perangkat Anda</strong> menggunakan teknologi pengenalan teks on-device.
          Foto tersebut <strong>tidak pernah dikirim ke server kami atau ke pihak mana pun</strong> untuk keperluan
          pembacaan ini. Setelah itu, Anda memilih sendiri cara penyimpanan foto strukturnya:
        </p>
        <List items={[
          "\"Lokal\" — foto disimpan hanya di folder privat aplikasi pada perangkat Anda, tidak pernah meninggalkan perangkat.",
          "\"Server\" — foto diunggah dan disimpan di layanan penyimpanan awan kami (lihat bagian 4) agar bisa diakses dari perangkat lain.",
        ]} />
      </Section>

      <Section title="3. Berbagi Data dengan Pihak Ketiga">
        <p style={{ lineHeight: 1.7, fontSize: 14, marginBottom: 10 }}>
          Kami <strong>tidak menjual</strong> data pribadi Anda kepada siapa pun. Data Anda hanya diproses oleh
          pihak berikut, sebatas yang diperlukan untuk menjalankan fitur terkait:
        </p>
        <List items={[
          "Google LLC — jika Anda menggunakan \"Masuk dengan Google\", Google memverifikasi identitas Anda dan membagikan nama & email ke kami untuk membuat/mencocokkan akun.",
          "Cloudflare, Inc. (layanan R2) — hanya jika Anda memilih mode penyimpanan \"Server\" untuk foto struk.",
          "Google AdMob — menampilkan iklan banner non-personalisasi di bagian bawah beberapa halaman pada aplikasi mobile. AdMob dapat memproses identifier perangkat/iklan (bukan nama atau email Anda) untuk menampilkan dan mengukur iklan tersebut.",
        ]} />
      </Section>

      <Section title="4. Lokasi Penyimpanan & Transfer Data Lintas Negara">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Basis data utama kami (akun, transaksi, dan seluruh data keuangan Anda) disimpan pada server yang
          berlokasi di <strong>Indonesia</strong>. Foto struk yang disimpan dengan mode "Server", serta proses
          autentikasi melalui Google, dapat diproses menggunakan infrastruktur milik penyedia layanan tersebut yang
          berlokasi di luar Indonesia. Penyedia layanan ini menerapkan standar keamanan internasional, dan data
          yang dibagikan ke mereka dibatasi hanya pada yang benar-benar diperlukan untuk fitur terkait.
        </p>
      </Section>

      <Section title="5. Berbagi Data Antar-Anggota Rumah Tangga (Household)">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          DompetDigitalKu dirancang untuk dipakai bersama oleh satu keluarga ("<strong>rumah tangga</strong>").
          <strong> Setiap anggota yang tergabung dalam rumah tangga yang sama dapat melihat seluruh transaksi,
          akun, aset, utang, dan anggaran milik rumah tangga tersebut</strong> — termasuk yang dicatat oleh anggota
          lain. Sebelum mengundang atau bergabung ke sebuah rumah tangga, pastikan Anda memahami dan menyetujui
          bahwa data keuangan akan terlihat oleh seluruh anggotanya.
        </p>
      </Section>

      <Section title="6. Tujuan & Dasar Hukum Pemrosesan">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Kami memproses data Anda untuk: (a) menyediakan dan menjalankan fitur Aplikasi sesuai permintaan Anda,
          (b) menjaga keamanan akun (pencegahan brute-force, sesi login), dan (c) memenuhi kewajiban hukum yang
          berlaku. Dasar hukum pemrosesan adalah <strong>persetujuan eksplisit Anda</strong> saat mendaftar/masuk,
          serta <strong>pelaksanaan permintaan Anda</strong> sebagai pengguna Aplikasi, sesuai UU PDP Pasal 20.
        </p>
      </Section>

      <Section title="7. Keamanan Data">
        <List items={[
          "Kata sandi disimpan dalam bentuk hash (bcrypt), tidak pernah dalam bentuk asli.",
          "Seluruh komunikasi antara aplikasi dan server dienkripsi (HTTPS/TLS).",
          "Token sesi login aplikasi mobile disimpan dalam penyimpanan terenkripsi di perangkat Anda (Android Keystore) dan berumur pendek.",
          "Kami menerapkan pembatasan percobaan masuk untuk mencegah serangan brute-force.",
        ]} />
      </Section>

      <Section title="8. Lama Penyimpanan Data">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Data Anda kami simpan selama akun Anda aktif. Jika Anda meminta penghapusan akun (lihat bagian 9), data
          pribadi dan data keuangan yang terkait akan dihapus dari sistem kami, kecuali data yang wajib kami simpan
          lebih lama untuk memenuhi kewajiban hukum.
        </p>
      </Section>

      <Section title="9. Hak Anda Sebagai Subjek Data">
        <p style={{ lineHeight: 1.7, fontSize: 14, marginBottom: 10 }}>
          Sesuai UU PDP, Anda berhak untuk: mengakses dan mendapat salinan data pribadi Anda; memperbaiki data yang
          tidak akurat; menghapus data pribadi Anda; menarik persetujuan yang pernah diberikan; serta mengajukan
          keberatan atas pemrosesan tertentu.
        </p>
        <p style={{ lineHeight: 1.7, fontSize: 14, marginBottom: 10 }}>
          <strong>Cara mengajukan:</strong> kirim email ke{" "}
          <a href="mailto:privacy@dompetdigitalku.my.id" className="link-plain">privacy@dompetdigitalku.my.id</a>{" "}
          dari alamat email yang terdaftar di akun Anda. Kami akan menindaklanjuti permintaan Anda paling lambat
          dalam waktu yang wajar sesuai ketentuan yang berlaku.
        </p>
        <p style={{ lineHeight: 1.7, fontSize: 14, color: "var(--ink-soft)" }}>
          Fitur hapus akun mandiri langsung dari dalam aplikasi sedang dalam pengembangan; sampai tersedia,
          permintaan penghapusan dapat diajukan melalui email di atas.
        </p>
      </Section>

      <Section title="10. Anak-Anak">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Aplikasi ini ditujukan untuk digunakan oleh individu yang berwenang mengelola keuangan keluarga (umumnya
          orang dewasa). Kami tidak secara sengaja mengumpulkan data dari anak-anak tanpa keterlibatan/pengawasan
          orang tua atau wali.
        </p>
      </Section>

      <Section title="11. Perubahan Kebijakan Privasi">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan signifikan akan
          diinformasikan melalui Aplikasi sebelum berlaku efektif.
        </p>
      </Section>

      <Section title="12. Hubungi Kami">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Untuk pertanyaan, permintaan terkait data pribadi, atau laporan insiden keamanan, hubungi:{" "}
          <a href="mailto:privacy@dompetdigitalku.my.id" className="link-plain">privacy@dompetdigitalku.my.id</a>
        </p>
      </Section>

      <p style={{ marginTop: 24, fontSize: 12.5 }}>
        <Link href="/terms" className="link-plain">Lihat Syarat &amp; Ketentuan →</Link>
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <p className="panel-title">{title}</p>
      {children}
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <p style={{ fontWeight: 600, fontSize: 13.5, margin: "10px 0 6px" }}>{children}</p>;
}

function List({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: "0 0 6px", paddingLeft: 20, lineHeight: 1.7, fontSize: 14 }}>
      {items.map((it, i) => (
        <li key={i} style={{ marginBottom: 4 }}>{it}</li>
      ))}
    </ul>
  );
}
