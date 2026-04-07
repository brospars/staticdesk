import type { Metadata } from "next";
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
  title: "FormDesk — The simplest way to hear from your customers",
  description:
    "Add an embeddable contact form to your site in minutes. Messages land in a shared team inbox. No per-seat pricing.",
  openGraph: {
    title: "FormDesk — Customer feedback, simplified",
    description:
      "Drop-in form widget. Shared team inbox. Free to start.",
    siteName: "FormDesk",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          src="https://phospho-nanocorp-prod--nanocorp-api-fastapi-app.modal.run/beacon/snippet.js?s=formdesk"
          defer
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
