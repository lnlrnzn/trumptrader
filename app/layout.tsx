import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ReactQueryProvider } from "@/lib/providers/react-query-provider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trump Tweet Trading Bot - Live Dashboard",
  description: "Real-time automated Bitcoin trading powered by AI analysis of influential tweets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} antialiased font-sans`}
      >
        <ReactQueryProvider>
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  );
}
