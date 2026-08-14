import { BrandMark } from "@/components/brand-mark";
import { Hero } from "@/components/hero";
import {
  Benefits,
  Faq,
  FinalCta,
  HowItWorks,
  SavingsBlock,
  SharedEnergy,
  Transparency,
  TrustStrip,
} from "@/components/landing-sections";
import { SiteHeader } from "@/components/site-header";
import { QualificationSection } from "@/features/qualification/components/qualification-section";
import { TrackingBootstrap } from "@/features/tracking/tracking-bootstrap";

export default function Home() {
  return (
    <div id="inicio" className="min-h-screen bg-background">
      <TrackingBootstrap />
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>

      <SiteHeader />

      <main id="conteudo-principal">
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <SharedEnergy />
        <Benefits />
        <SavingsBlock />
        <QualificationSection />
        <Transparency />
        <Faq />
        <FinalCta />
      </main>

      <footer className="site-footer">
        <div className="container-shell">
          <BrandMark compact />
          <div className="footer-copy">
            <p>
              Uma solução para analisar sua conta e apresentar condições de
              energia compartilhada.
            </p>
            <p>
              Participação, percentual e economia sujeitos à análise e às
              condições aplicáveis.
            </p>
          </div>
          <span className="footer-policy">Política de Privacidade — em preparação</span>
        </div>
      </footer>
    </div>
  );
}
