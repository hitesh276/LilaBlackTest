import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LILA BLACK — Player Journey Visualizer",
  description:
    "Level design tool for exploring player movement, combat, and behavior on LILA BLACK maps.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-lila-bg text-slate-200 antialiased">{children}</body>
    </html>
  );
}
