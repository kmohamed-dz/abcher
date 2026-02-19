import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";

import "./globals.css";

export const metadata: Metadata = {
  title: "أبشر",
  description: "منصة إدارة المدارس القرآنية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-beige-100 text-gray-900 antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3200,
            style: {
              fontFamily: "Cairo, sans-serif",
            },
            success: {
              style: {
                background: "#16a34a",
                color: "#ffffff",
              },
            },
            error: {
              style: {
                background: "#dc2626",
                color: "#ffffff",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
