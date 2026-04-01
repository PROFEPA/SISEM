import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/i18n";
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
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <I18nProvider>
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
