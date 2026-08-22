import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Distributor.lol: The distribution market",
    template: "%s · Distributor.lol",
  },
  description:
    "The distribution market. Put money in, get measurable attention out. A live leaderboard where every dollar is actually put to work.",
  keywords: [
    "startup distribution",
    "startup marketing",
    "pay to rank",
    "leaderboard",
    "startup launch",
    "founder distribution",
  ],
  openGraph: {
    title: "Distributor.lol: The distribution market",
    description:
      "Put money in, get measurable attention out. A live leaderboard where every dollar is put to work.",
    type: "website",
    url: "/",
    images: [
      {
        url: "/distributor-og-v2.png",
        width: 1730,
        height: 909,
        alt: "Distributor.lol — Marketing that works",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Distributor.lol: The distribution market",
    description:
      "Put money in, get measurable attention out. A live leaderboard where every dollar is put to work.",
    images: ["/distributor-og-v1.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta
          name="google-site-verification"
          content="6m_4ZjmSXUh3AOuRdtxjrt7H3sJ6kXF5MTWM5pBS234"
        />
        {/* Force light theme on first visit. Only switches to dark if user
            explicitly toggles it (stored in localStorage as "theme":"dark"). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(!t||t==='system'){document.documentElement.classList.remove('dark');localStorage.setItem('theme','light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <SiteHeader />
          <main className="flex-1 flex flex-col">{children}</main>
          <SiteFooter />
        </ThemeProvider>
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
