import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AutistasTips — Gestão profissional de apostas",
    template: "%s · AutistasTips",
  },
  description:
    "Planilha inteligente para gerenciamento profissional de apostas esportivas.",
  applicationName: "AutistasTips",
  robots: { index: false },
  openGraph: {
    title: "AutistasTips — Gestão profissional de apostas",
    description:
      "Planilha inteligente para gerenciamento profissional de apostas esportivas.",
    siteName: "AutistasTips",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0c0e",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
