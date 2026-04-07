import "./globals.scss";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flood Warning GIS Platform",
  description: "Geospatial flood warning and monitoring dashboard",
  metadataBase: new URL("https://flood-gis.local"),
  applicationName: "Flood Warning GIS Platform",
  keywords: [
    "flood monitoring",
    "gis dashboard",
    "flood risk map",
    "maplibre",
    "cesium",
  ],
  openGraph: {
    title: "Flood Warning GIS Platform",
    description: "Geospatial flood warning and monitoring dashboard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flood Warning GIS Platform",
    description: "Geospatial flood warning and monitoring dashboard",
  },
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
