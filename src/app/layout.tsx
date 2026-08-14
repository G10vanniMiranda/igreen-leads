import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conexão Green | Economia sem instalar placas solares",
  description:
    "Descubra gratuitamente se sua conta pode participar de uma solução de energia compartilhada, sem investimento inicial ou instalação de placas solares.",
  openGraph: {
    title: "Conexão Green | Energia compartilhada",
    description:
      "Verifique gratuitamente se sua conta pode participar, sem instalar placas solares no imóvel.",
    locale: "pt_BR",
    type: "website",
  },
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
