import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "./header";
import { ServiceWorkerRegister } from "./sw-register";
import { GoogleAdsense } from "./google-adsense";

// Sama dengan font app Android (ThemeData.fontFamily: 'Roboto').
const roboto = Roboto({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DompetDigitalKu",
  description: "Pengelolaan keuangan keluarga",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DompetDigitalKu",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${roboto.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GoogleAdsense />
        <ServiceWorkerRegister />
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
