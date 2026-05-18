import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { PageTransition } from "@/components/PageTransition";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AnesMap",
  description: "Design system app for anesthesiology study and practice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-4">
          <PageTransition>{children}</PageTransition>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
