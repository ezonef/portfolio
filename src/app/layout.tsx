import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// next/font downloads the fonts at build time and serves them from our own domain.
const sans = Inter_Tight({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Mykyta Sharapaniuk — Product designer",
  description: "Design systems, admin panels and iOS apps. Complex products, made simple to use.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
