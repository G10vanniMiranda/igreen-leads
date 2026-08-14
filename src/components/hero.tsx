const trustPoints = [
  "Sem investimento inicial",
  "Sem instalação de placas",
  "Análise gratuita",
] as const;

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-5 shrink-0 text-primary"
      fill="none"
    >
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.12" />
      <path
        d="m6.4 10.1 2.2 2.2 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="container-shell hero-grid">
        <div>
          <p className="mb-5 text-sm font-bold tracking-[0.15em] text-primary uppercase">
            Economia por energia compartilhada
          </p>
          <h1 id="hero-title" className="hero-title">
            Economize na sua conta de energia sem instalar placas solares.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted sm:text-xl">
            Descubra gratuitamente se sua conta pode participar da Conexão
            Green.
          </p>

          <p className="hero-context">
            Uma análise inicial simples para entender as condições da sua unidade
            consumidora.
          </p>

          <a
            href="#qualificacao"
            className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-primary px-7 py-3.5 text-base font-bold text-primary-contrast shadow-lg shadow-green-900/10 transition-colors hover:bg-primary-hover sm:w-auto"
          >
            Verificar minha conta
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="size-5"
              fill="none"
            >
              <path
                d="M4 10h12m-4.5-4.5L16 10l-4.5 4.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </a>

          <ul className="mt-8 grid gap-3 text-sm font-semibold text-foreground sm:grid-cols-3">
            {trustPoints.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <CheckIcon />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="energy-grid" />
          <div className="absolute top-7 left-7 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-white/60 uppercase">
            <span className="size-2 rounded-full bg-green-400" />
            Conexão ativa
          </div>
          <div className="account-card">
            <p className="text-sm text-white/60">Sua conta de energia</p>
            <p className="mt-2 max-w-xs text-3xl font-semibold tracking-[-0.04em]">
              Primeiro, vamos entender seu perfil.
            </p>
            <div className="account-status">
              <span className="grid size-11 place-items-center rounded-full bg-green-400/15 text-green-300">
                <CheckIcon />
              </span>
              <span>
                <span className="block text-xs text-white/55">Próximo passo</span>
                <span className="mt-1 block text-sm font-semibold">
                  Análise de elegibilidade
                </span>
              </span>
            </div>
          </div>
          <p className="absolute bottom-7 left-7 z-10 max-w-xs text-xs leading-5 text-white/50">
            A participação está sujeita à análise da unidade consumidora e às
            condições aplicáveis.
          </p>
        </div>
      </div>
    </section>
  );
}
