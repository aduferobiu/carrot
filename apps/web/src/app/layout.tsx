import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Toast } from "@/components/kobo/Toast";
import { KoboProvider } from "@/lib/kobo/store";
import "./globals.css";
import "./kobo.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Carrot — every naira, one screen",
  description: "Multi-bank personal finance management for Nigeria.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <KoboProvider>
          {children}
          <Toast />
        </KoboProvider>
      </body>
    </html>
  );
}
