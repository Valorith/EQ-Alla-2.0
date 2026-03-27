import type { Metadata } from "next";
import { Cinzel, Manrope, Sora } from "next/font/google";
import "./globals.css";
import { Shell } from "../components/catalog";

const display = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display"
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"]
});

const brand = Cinzel({
  subsets: ["latin"],
  variable: "--font-brand",
  weight: ["600", "700"]
});

export const metadata: Metadata = {
  title: "EQ Alla 2.0",
  description: "Modern EverQuest encyclopedia built for EQEmu-style data."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${brand.variable}`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
