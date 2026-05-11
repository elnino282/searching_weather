import "./styles/globals.scss";
import { Metadata, Viewport } from "next";
import PWAProvider from "./context/pwa-provider";
import NetworkStatusBanner from "./components/pwa/NetworkStatusBanner";
import LanguageContextProvider from "./context/language-provider"; // Move this up from page.tsx or we can leave LanguageProvider in page.tsx and import NetworkBanner there.

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
};

export const metadata: Metadata = {
  manifest: "/manifest.json",
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
