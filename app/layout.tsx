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
  title: "Multicotador Whole Life | Robson Tavernard",
  description: "Comparativo de seguros de vida Whole Life entre seguradoras (MAG, Icatu, MetLife, Prudential)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col bg-vault-studio font-sans text-cofre-texto selection:bg-cofre-acento/30 selection:text-cofre-texto">
        {/* Marca d'água de monograma com vinheta radial suave */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-monogram-vignette mix-blend-screen"
        />
        <div className="relative z-10 flex min-h-full flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
