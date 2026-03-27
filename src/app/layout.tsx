import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SISEM - PROFEPA",
  description:
    "Sistema Integral de Seguimiento de Expedientes de Multas - PROFEPA",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://sisem.vercel.app"
  ),
  openGraph: {
    title: "SISEM - PROFEPA",
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
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
