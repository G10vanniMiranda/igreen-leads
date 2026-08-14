import { QualificationFlow } from "./qualification-flow";

export function QualificationSection() {
  return (
    <section
      id="qualificacao"
      className="qualification-section"
      aria-labelledby="qualification-title"
    >
      <div className="container-shell">
        <div className="qualification-intro">
          <div>
            <p className="text-sm font-bold tracking-[0.15em] text-primary uppercase">
              Análise inicial
            </p>
            <h2
              id="qualification-title"
              className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            >
              Verifique sua conta em poucos passos
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-muted sm:text-lg">
            São seis perguntas rápidas, sem dados pessoais. Suas respostas
            ajudam a preparar a próxima etapa da análise.
          </p>
        </div>

        <QualificationFlow />
      </div>
    </section>
  );
}
