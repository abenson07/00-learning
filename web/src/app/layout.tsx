import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { DashboardShell } from "@/components/dashboard-shell";
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
  title: "Learning Platform",
  description: "A learning platform prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${geistSans.className} h-full font-sans antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
