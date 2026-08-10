import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nutrirelay.in"),
  title: {
    default: "NutriRelay",
    template: "%s | NutriRelay",
  },
  description: "Nutrition coaching operations platform with WhatsApp-based meal logging and adherence workflows",
  openGraph: {
    title: "NutriRelay",
    description: "Nutrition coaching operations platform with WhatsApp-based meal logging and adherence workflows",
    url: "https://nutrirelay.in",
    siteName: "NutriRelay",
    images: [
      {
        url: "/brand/nutrirelay-logo.png",
        width: 512,
        height: 512,
        alt: "NutriRelay logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "NutriRelay",
    description: "Nutrition coaching operations platform with WhatsApp-based meal logging and adherence workflows",
    images: ["/brand/nutrirelay-logo.png"],
  },
  icons: {
    icon: "/brand/nutrirelay-logo.png",
    apple: "/brand/nutrirelay-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
