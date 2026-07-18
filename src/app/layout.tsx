import type { Metadata, Viewport } from "next";
import { Silkscreen, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { TvProvider } from "@/lib/tv";
import CrtScreen from "@/components/CrtScreen";

const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "CHILL//OS — CRT focus terminal",
  description:
    "A cyberpunk focus / ambient music terminal. The whole site is the CRT screen.",
};

export const viewport: Viewport = {
  themeColor: "#030407",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${silkscreen.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-dvh">
        <TvProvider>
          <CrtScreen>{children}</CrtScreen>
        </TvProvider>
      </body>
    </html>
  );
}
