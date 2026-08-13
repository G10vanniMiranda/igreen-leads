export function QualificationPlaceholder() {
  return (
    <section
      id="qualificacao"
      className="qualification-section"
      aria-labelledby="qualification-title"
    >
      <div className="container-shell">
        <div className="qualification-card">
          <div>
            <p className="text-sm font-bold tracking-[0.15em] text-primary uppercase">
              Próxima etapa
            </p>
            <h2
              id="qualification-title"
              className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            >
              Verificação da sua conta
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
            O fluxo de pré-qualificação será iniciado aqui. Em breve, você
            poderá informar os dados básicos da sua unidade consumidora para
            uma análise inicial.
          </p>
        </div>
      </div>
    </section>
  );
}
