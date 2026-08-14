import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ConsentPreferencesPanel } from "@/features/privacy/consent-preferences";
import { parseAnalyticsConfig } from "@/features/tracking/config";
import { TrackingBootstrap } from "@/features/tracking/tracking-bootstrap";
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
  robots: process.env.INDEXING_ENABLED === "true"
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  const analyticsConfig = parseAnalyticsConfig({
    ANALYTICS_ENVIRONMENT: process.env.ANALYTICS_ENVIRONMENT,
    META_PIXEL_ENABLED: process.env.META_PIXEL_ENABLED,
    META_PIXEL_ID: process.env.META_PIXEL_ID,
    GA_ENABLED: process.env.GA_ENABLED,
    GA_MEASUREMENT_ID: process.env.GA_MEASUREMENT_ID,
  });
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <TrackingBootstrap config={analyticsConfig} />
        <ConsentPreferencesPanel />
      </body>
    </html>
  );
}
