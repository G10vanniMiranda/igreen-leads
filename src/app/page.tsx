import { BrandMark } from "@/components/brand-mark";
import { Hero } from "@/components/hero";
import { QualificationPlaceholder } from "@/features/qualification/components/qualification-placeholder";

export default function Home() {
  return (
    <div id="inicio" className="min-h-screen bg-background">
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>

      <header className="site-header">
        <div className="container-shell flex h-full items-center justify-between">
          <a href="#inicio" aria-label="Conexão Green — início">
            <BrandMark />
          </a>
          <span className="header-note">Energia compartilhada</span>
        </div>
      </header>

      <main id="conteudo-principal">
        <Hero />
        <QualificationPlaceholder />
      </main>

      <footer className="site-footer">
        <div className="container-shell">
          <BrandMark compact />
          <p>Uma forma simples de descobrir se sua conta pode economizar.</p>
        </div>
      </footer>
    </div>
  );
}
