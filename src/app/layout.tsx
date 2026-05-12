import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tenant Access Control Plane",
  description:
    "Next.js control plane for tenant access governance, GraphQL APIs, role-aware workflows, and production-style delivery assets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[var(--surface-shell)] text-[var(--ink-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
