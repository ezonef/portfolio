import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { PhoneGate } from "@/components/site/PhoneGate/PhoneGate";
import "@/styles/fonts.css";
import "./globals.css";

/** The faces every page needs first */
const PRELOAD_FONTS = ["inter-tight-latin-400-normal", "jetbrains-mono-latin-400-normal"];

export const metadata: Metadata = {
  title: "Mykyta Sharapaniuk — Product designer",
  description: "Design systems, admin panels and iOS apps. Complex products, made simple to use.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {PRELOAD_FONTS.map((f) => (
          <link key={f} rel="preload" href={`/fonts/${f}.woff2`} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
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
        {/* Cookieless visitor stats; reports only from the Vercel deployment */}
        <Analytics />
      </body>
    </html>
  );
}
