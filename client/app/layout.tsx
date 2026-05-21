import "./styles/globals.scss";
import { Metadata, Viewport } from "next";
import PWAProvider from "./context/pwa-provider";

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
};

export const metadata: Metadata = {
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.ico",
  },
  title: "WeCliFor",
  description: "A beautiful and responsive weather application.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body>
        <PWAProvider>
          {children}
        </PWAProvider>
      </body>
    </html>
  );
}
