import type { Metadata } from "next";
import Link from "next/link";
import { JetBrains_Mono, Outfit } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { PageTransition } from "@/components/PageTransition";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import { getAuthContext } from "@/lib/auth";
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
  const authPromise = getAuthContext();

  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        <Header authPromise={authPromise} />
        <AuthBootstrap />
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-4">
          <PageTransition>{children}</PageTransition>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}

async function Header({
  authPromise,
}: {
  authPromise: ReturnType<typeof getAuthContext>;
}) {
  const auth = await authPromise;
  return (
    <header className="mx-auto mt-3 flex w-full max-w-md items-center justify-between px-4">
      <p className="text-xs text-muted">{auth ? `Olá, ${auth.name ?? "Usuário"}` : "AnesMap"}</p>
      <div className="flex items-center gap-2 text-xs">
        {auth ? (
          <>
            {auth.role === "admin" && (
              <Link
                href="/admin"
                className="rounded-lg border border-purple/30 bg-purple/10 px-2 py-1 text-purple hover:opacity-80"
              >
                Admin
              </Link>
            )}
            <Link
              href="/logout"
              className="rounded-lg border border-border bg-background/35 px-2 py-1 text-muted hover:text-foreground"
            >
              Sair
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-lg border border-border bg-background/35 px-2 py-1 text-muted hover:text-foreground"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="rounded-lg border border-border bg-background/35 px-2 py-1 text-muted hover:text-foreground"
            >
              Criar conta
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
