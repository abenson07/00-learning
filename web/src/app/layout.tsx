import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between p-4">
            <div className="font-semibold">Learning Platform</div>
            <nav className="flex items-center gap-2">
              <Link
                href="/library"
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Library
              </Link>
              <Link
                href="/lessons"
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Lessons
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
      </body>
    </html>
  );
}
