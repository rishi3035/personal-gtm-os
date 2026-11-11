import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal GTM Operating System | AiVi Intelligence",
  description: "Local-First Personal GTM Operating System with zero SaaS subscription overhead.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
