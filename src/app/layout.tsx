import "./globals.scss";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flood Warning GIS Platform",
  description: "Geospatial flood warning and monitoring dashboard",
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
