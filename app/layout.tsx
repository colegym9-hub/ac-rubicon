import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4, Geist_Mono, Caveat } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import CommandPalette from "@/components/command/CommandPalette";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AC Rubicon",
  description: "Optimizing my past into building my future.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AC Rubicon",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} ${geistMono.variable} ${caveat.variable}`}
    >
      <body>
        {children}
        <BottomNav />
        <CommandPalette />
      </body>
    </html>
  );
}
