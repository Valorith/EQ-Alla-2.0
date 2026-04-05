import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "../components/app-shell";

export const metadata: Metadata = {
  title: "EQ Alla 2.0",
  description: "Modern EverQuest encyclopedia built for EQEmu-style data."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
