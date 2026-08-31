import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "./header";
import { ServiceWorkerRegister } from "./sw-register";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});
const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-num",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
