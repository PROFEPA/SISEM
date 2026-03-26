import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SISEM — PROFEPA",
  description:
    "Sistema Integral de Seguimiento de Expedientes de Multas — PROFEPA",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://sisem.vercel.app"
  ),
  openGraph: {
    title: "SISEM — PROFEPA",
    description:
      "Sistema Integral de Seguimiento de Expedientes de Multas",
    images: [{ url: "/og-image.png", width: 512, height: 512 }],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
