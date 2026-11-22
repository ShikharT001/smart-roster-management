import React, { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Smart Roster Management System",
  description: "Deterministic ops roster planning, validation and conflict detection for D2C brands",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-accent/20">
        <Suspense fallback={<div className="h-12 border-b border-border bg-surface" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
