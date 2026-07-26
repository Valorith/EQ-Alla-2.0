import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "../components/app-shell";
import { siteName, siteUrl } from "../components/page-metadata";

const siteDescription = "Modern EverQuest encyclopedia built for EQEmu-style data.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: siteName,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  applicationName: siteName,
  openGraph: {
    type: "website",
    siteName,
    title: siteName,
    description: siteDescription,
    url: siteUrl.toString()
  },
  twitter: {
    card: "summary",
    title: siteName,
    description: siteDescription
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#10131a"
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
