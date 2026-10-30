import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auralis — The MedSpa Operating System",
  description:
    "All-in-one MedSpa management ecosystem for the USA & UK: appointments, patient EMR, lead pipelines, AI growth agents, payments, inventory and analytics — one platform, every location.",
  keywords: ["medspa software", "med spa management", "EMR", "booking", "aesthetics clinic", "AI receptionist", "USA", "UK"],
  authors: [{ name: "Auralis" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "Auralis — The MedSpa Operating System",
    description: "Bookings, EMR, growth AI, payments & analytics for US + UK medspas.",
    siteName: "Auralis",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${inter.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
