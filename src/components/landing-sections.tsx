import {
  benefits,
  faqItems,
  processSteps,
  QUALIFICATION_TARGET,
  savingsClaim,
  savingsDisclaimer,
  trustHighlights,
} from "@/features/landing/content";

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none">
      <path
        d="M4 10h12m-4.5-4.5L16 10l-4.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  inverse = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  inverse?: boolean;
}) {
  return (
    <div className={`section-heading${inverse ? " section-heading-inverse" : ""}`}>
      <p className="section-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="Benefícios principais">
      <div className="container-shell trust-grid">
        {trustHighlights.map((item, index) => (
          <article key={item.title} className="trust-item">
            <span aria-hidden="true">0{index + 1}</span>
            <div>
              <p>{item.eyebrow}</p>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="como-funciona" className="landing-section how-section">
      <div className="container-shell">
        <SectionHeading
          eyebrow="Como funciona"
          title="Clareza em cada etapa, da análise à orientação."
          description="A pré-qualificação é o começo da avaliação — não uma aprovação automática."
        />
        <ol className="process-grid">
          {processSteps.map((step, index) => (
            <li key={step.title} className="process-card">
              <span className="process-number">{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function SharedEnergy() {
  return (
    <section className="landing-section energy-section" aria-labelledby="energia-title">
      <div className="container-shell energy-layout">
        <div>
          <p className="section-eyebrow">Energia compartilhada</p>
          <h2 id="energia-title">Energia renovável sem transformar o seu telhado.</h2>
          <p className="energy-lead">
            A geração acontece fora do seu imóvel. A energia passa pela rede da
            distribuidora e pode gerar créditos para a unidade consumidora,
            conforme as condições aplicáveis.
          </p>
          <div className="energy-note">
            <strong>A distribuidora continua presente.</strong>
            <span>
              Ela permanece responsável pela infraestrutura física da rede e pelo
              fornecimento de energia.
            </span>
          </div>
        </div>

        <div className="energy-diagram" aria-label="Fluxo simplificado da energia compartilhada">
          <div className="energy-node energy-node-source">
            <span aria-hidden="true" className="energy-symbol">☀</span>
            <strong>Geração renovável</strong>
            <small>Usina compartilhada</small>
          </div>
          <span className="energy-connector" aria-hidden="true">→</span>
          <div className="energy-node">
            <span aria-hidden="true" className="energy-symbol">⌁</span>
            <strong>Rede local</strong>
            <small>Sua distribuidora</small>
          </div>
          <span className="energy-connector" aria-hidden="true">→</span>
          <div className="energy-node">
            <span aria-hidden="true" className="energy-symbol">⌂</span>
            <strong>Sua unidade</strong>
            <small>Créditos e compensação*</small>
          </div>
          <p>*Conforme elegibilidade e condições aplicáveis.</p>
        </div>
      </div>
    </section>
  );
}

export function Benefits() {
  return (
    <section id="beneficios" className="landing-section benefits-section">
      <div className="container-shell">
        <SectionHeading
          eyebrow="Benefícios"
          title="Uma alternativa leve para cuidar da conta de energia."
          description="Sem obra, sem compra de equipamentos e com uma jornada inicial pensada para ser simples."
        />
        <div className="benefits-grid">
          {benefits.map((benefit, index) => (
            <article key={benefit.title} className="benefit-card">
              <span aria-hidden="true" className="benefit-mark">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SavingsBlock() {
  return (
    <section className="savings-section" aria-labelledby="economia-title">
      <div className="container-shell savings-layout">
        <div>
          <p className="section-eyebrow">Economia com responsabilidade</p>
          <h2 id="economia-title">{savingsClaim}</h2>
          <p className="savings-disclaimer">{savingsDisclaimer}</p>
        </div>
        <a className="light-cta" href={QUALIFICATION_TARGET}>
          Verificar minha conta
          <ArrowIcon />
        </a>
      </div>
    </section>
  );
}

export function Transparency() {
  return (
    <section className="landing-section transparency-section" aria-labelledby="depois-title">
      <div className="container-shell transparency-layout">
        <div className="transparency-index" aria-hidden="true">
          <span>Depois</span>
          <strong>04</strong>
        </div>
        <div>
          <p className="section-eyebrow">Transparência</p>
          <h2 id="depois-title">O que acontece depois?</h2>
          <p className="transparency-lead">
            A resposta da pré-qualificação abre uma análise — ela não substitui a
            conferência das condições da sua conta.
          </p>
          <ul className="transparency-list">
            <li>Analisamos as informações iniciais enviadas.</li>
            <li>Conferimos as condições da unidade consumidora.</li>
            <li>Orientamos os próximos passos quando houver aderência.</li>
            <li>A compensação e a economia não começam necessariamente de imediato.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="duvidas" className="landing-section faq-section">
      <div className="container-shell faq-layout">
        <SectionHeading
          eyebrow="Dúvidas frequentes"
          title="Informação direta para decidir com tranquilidade."
          description="As condições finais dependem da análise da unidade consumidora e das regras aplicáveis."
        />
        <div className="faq-list">
          {faqItems.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="final-cta-section" aria-labelledby="final-cta-title">
      <div className="container-shell final-cta-card">
        <div>
          <p className="section-eyebrow">Seu próximo passo</p>
          <h2 id="final-cta-title">Quer saber se sua conta pode participar?</h2>
          <p>Responda algumas perguntas e solicite sua análise inicial gratuita.</p>
        </div>
        <a className="primary-cta" href={QUALIFICATION_TARGET}>
          Analisar minha conta
          <ArrowIcon />
        </a>
      </div>
    </section>
  );
}
