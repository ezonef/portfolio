import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { PhoneGate } from "@/components/site/PhoneGate/PhoneGate";
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
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Before the first paint: apply a pinned theme (no light flash), the desktop layout if a phone chose it,
            and mark that JS runs, so entrance animations can start hidden without hiding content when JS is off */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add("js");try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;if(localStorage.getItem("view")==="desktop"){document.documentElement.dataset.view="desktop";var m=document.querySelector('meta[name="viewport"]');if(m)m.content="width=1280"}}catch(e){}`,
          }}
        />
      </head>
      <body>
        <PhoneGate />
        {children}
      </body>
    </html>
  );
}
