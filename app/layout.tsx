import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conference Realignment Tool",
  description: "Explore conference alignment scenarios with interactive team and map controls.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
