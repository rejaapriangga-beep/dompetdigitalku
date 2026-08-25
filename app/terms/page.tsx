// app/terms/page.tsx
// Syarat & Ketentuan Layanan — mencerminkan kondisi layanan yang sebenarnya
// saat ini (gratis, belum ada fitur berbayar), dengan klausul umum yang
// wajar untuk aplikasi pencatatan keuangan (bukan lembaga jasa keuangan).
import Link from "next/link";

export const metadata = {
  title: "Syarat & Ketentuan — DompetDigitalKu",
};

export default function TermsPage() {
  return (
    <main className="page-main" style={{ maxWidth: 760 }}>
      <p className="page-title" style={{ fontSize: 26 }}>Syarat &amp; Ketentuan</p>
      <p style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 24 }}>
        Berlaku sejak: 21 Agustus 2026 &middot; Terakhir diperbarui: 21 Agustus 2026
      </p>

      <div className="panel">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Selamat datang di DompetDigitalKu ("<strong>Aplikasi</strong>"), dikelola oleh{" "}
          <strong>MangJaja</strong> ("kami"). Dengan mendaftar dan menggunakan Aplikasi ini, Anda
          menyetujui Syarat &amp; Ketentuan berikut. Jika Anda tidak setuju, mohon untuk tidak menggunakan Aplikasi.
        </p>
      </div>

      <Section title="1. Deskripsi Layanan">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          DompetDigitalKu adalah aplikasi <strong>pencatatan keuangan pribadi/keluarga</strong> (pembukuan
          mandiri). Aplikasi ini <strong>bukan</strong> lembaga jasa keuangan, bukan penyedia layanan pembayaran,
          bukan penyalur pinjaman, dan tidak terhubung langsung ke rekening bank atau institusi keuangan mana pun.
          Seluruh data transaksi, saldo, aset, dan utang dicatat secara manual oleh pengguna dan hanya bersifat
          informasi — bukan transaksi keuangan sungguhan yang diproses oleh kami. Aplikasi ini juga{" "}
          <strong>tidak memberikan nasihat keuangan, investasi, atau perpajakan profesional</strong>; segala
          angka/skor yang ditampilkan (mis. "Kesehatan Keuangan") bersifat estimasi informatif, bukan rekomendasi
          yang mengikat.
        </p>
      </Section>

      <Section title="2. Pendaftaran Akun">
        <List items={[
          "Anda harus memberikan informasi yang benar dan akurat saat mendaftar.",
          "Anda bertanggung jawab menjaga kerahasiaan kata sandi dan seluruh aktivitas yang terjadi di akun Anda.",
          "Aplikasi ini ditujukan untuk pengguna yang cakap secara hukum mengelola data keuangan pribadi/keluarganya (umumnya berusia 18 tahun ke atas, atau di bawah pengawasan orang tua/wali).",
        ]} />
      </Section>

      <Section title="3. Model Rumah Tangga (Household)">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Aplikasi menggunakan model "rumah tangga" tempat beberapa akun pengguna dapat bergabung dan berbagi data
          keuangan yang sama. Dengan bergabung ke sebuah rumah tangga, Anda menyetujui bahwa seluruh anggota
          rumah tangga tersebut dapat melihat data transaksi dan keuangan yang tercatat di dalamnya. Pemilik
          ("owner") rumah tangga bertanggung jawab mengelola siapa saja yang menjadi anggotanya.
        </p>
      </Section>

      <Section title="4. Biaya Layanan">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Saat ini Aplikasi disediakan <strong>secara gratis</strong>. Kami dapat memperkenalkan fitur atau paket
          berbayar (mis. paket "premium") di kemudian hari. Jika hal itu terjadi, kami akan menginformasikan
          harga, fitur, dan ketentuan pembayaran secara jelas sebelum diberlakukan, dan fitur inti yang sudah Anda
          gunakan secara gratis tidak akan tiba-tiba dikunci tanpa pemberitahuan.
        </p>
      </Section>

      <Section title="5. Kewajiban Pengguna">
        <List items={[
          "Tidak menggunakan Aplikasi untuk tujuan melanggar hukum.",
          "Tidak mencoba mengakses akun atau data pengguna lain tanpa izin.",
          "Tidak memasukkan data pribadi pihak lain ke dalam Aplikasi tanpa izin/sepengetahuan pihak tersebut, mengingat data yang dimasukkan dapat terlihat oleh anggota rumah tangga yang sama.",
          "Tidak mencoba mengganggu, membebani berlebihan, atau merusak sistem/infrastruktur Aplikasi.",
        ]} />
      </Section>

      <Section title="6. Kepemilikan Data">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Data keuangan yang Anda catat tetap menjadi milik Anda. Kami memprosesnya semata-mata untuk
          menjalankan fitur Aplikasi sesuai Kebijakan Privasi kami. Anda dapat meminta penghapusan akun dan data
          Anda kapan pun (lihat Kebijakan Privasi bagian 9).
        </p>
      </Section>

      <Section title="7. Batasan Tanggung Jawab">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Aplikasi disediakan "sebagaimana adanya" (as is). Kami berupaya menjaga keandalan dan keamanan layanan,
          namun tidak menjamin Aplikasi akan selalu bebas dari gangguan atau kesalahan. Kami tidak bertanggung
          jawab atas kerugian yang timbul dari kesalahan pencatatan data oleh pengguna, keputusan keuangan yang
          diambil berdasarkan informasi dalam Aplikasi, atau gangguan layanan pihak ketiga yang kami gunakan.
        </p>
      </Section>

      <Section title="8. Penangguhan atau Penghentian Akun">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Kami berhak menangguhkan atau menghentikan akses akun yang terbukti melanggar Syarat &amp; Ketentuan
          ini. Anda dapat menghentikan penggunaan Aplikasi dan meminta penghapusan akun kapan saja melalui{" "}
          <a href="mailto:privacy@dompetdigitalku.my.id" className="link-plain">privacy@dompetdigitalku.my.id</a>.
        </p>
      </Section>

      <Section title="9. Perubahan Ketentuan">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Kami dapat memperbarui Syarat &amp; Ketentuan ini dari waktu ke waktu. Perubahan signifikan akan
          diinformasikan melalui Aplikasi sebelum berlaku efektif. Penggunaan Aplikasi setelah perubahan berlaku
          dianggap sebagai persetujuan Anda atas ketentuan yang baru.
        </p>
      </Section>

      <Section title="10. Hukum yang Berlaku">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Syarat &amp; Ketentuan ini tunduk pada dan ditafsirkan sesuai hukum Republik Indonesia. Setiap
          perselisihan yang timbul akan diupayakan diselesaikan secara musyawarah terlebih dahulu.
        </p>
      </Section>

      <Section title="11. Hubungi Kami">
        <p style={{ lineHeight: 1.7, fontSize: 14 }}>
          Pertanyaan seputar Syarat &amp; Ketentuan ini dapat disampaikan ke{" "}
          <a href="mailto:privacy@dompetdigitalku.my.id" className="link-plain">privacy@dompetdigitalku.my.id</a>
        </p>
      </Section>

      <p style={{ marginTop: 24, fontSize: 12.5 }}>
        <Link href="/privacy" className="link-plain">Lihat Kebijakan Privasi →</Link>
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

function List({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: "0 0 6px", paddingLeft: 20, lineHeight: 1.7, fontSize: 14 }}>
      {items.map((it, i) => (
        <li key={i} style={{ marginBottom: 4 }}>{it}</li>
      ))}
    </ul>
  );
}
