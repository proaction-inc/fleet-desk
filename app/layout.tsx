import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://thefleetdesk.com"),
  title: {
    default: "The Fleet Desk | Fleet Industry Intelligence",
    template: "%s | The Fleet Desk",
  },
  description:
    "Independent fleet industry intelligence. Daily news, weekly analysis, and deep dives into fleet management, safety, regulatory changes, and transportation technology.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "The Fleet Desk",
    title: "The Fleet Desk | Fleet Industry Intelligence",
    description:
      "Independent fleet industry intelligence. Daily news, weekly analysis, and deep dives into fleet management, safety, and transportation technology.",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Fleet Desk",
    description:
      "Independent fleet industry intelligence. Daily news and analysis.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
