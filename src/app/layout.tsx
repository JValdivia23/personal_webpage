import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/NavBar";
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
  metadataBase: new URL("https://JValdivia23.github.io/personal_webpage"), // Update with actual URL if different
  title: "Jairo M. Valdivia | Personal Webpage",
  description: "Ph.D. Student at University of Colorado Boulder (ATOC). Radar Scientist specializing in cloud microphysics and precipitation studies.",
  keywords: ["Radar Meteorology", "Cloud Microphysics", "Atmospheric Science", "CU Boulder", "Jairo Valdivia"],
  authors: [{ name: "Jairo M. Valdivia" }],
  icons: {
    icon: "/personal_webpage/icon.svg",
  },
  openGraph: {
    title: "Jairo M. Valdivia | Personal Webpage",
    description: "Radar Scientist and Ph.D. Student at CU Boulder.",
    url: "https://JValdivia23.github.io/personal_webpage",
    siteName: "Jairo M. Valdivia",
    images: [
      {
        url: "/personal_webpage/photo.jpeg",
        width: 1200,
        height: 1200,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jairo M. Valdivia | Personal Webpage",
    description: "Radar Scientist and Ph.D. Student at CU Boulder.",
    images: ["/personal_webpage/photo.jpeg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NavBar />
        <main className="pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}
