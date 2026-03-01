import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Synapse — Intelligent Content Platform",
  description:
    "Synapse unifies content ideation, production, analytics, and distribution in one streamlined platform. From trend discovery to multi-modal creation and real-time performance insights.",
  keywords: ["content platform", "content creation", "analytics", "distribution", "Synapse"],
  openGraph: {
    title: "Synapse — Intelligent Content Platform",
    description: "One platform. Every stage of content.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
