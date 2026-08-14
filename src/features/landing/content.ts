export const QUALIFICATION_TARGET = "#qualificacao";

export const navigationItems = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Benefícios", href: "#beneficios" },
  { label: "Dúvidas", href: "#duvidas" },
] as const;

export const trustHighlights = [
  {
    eyebrow: "Modelo simples",
    title: "Energia compartilhada",
    description: "Créditos de energia são compensados conforme as condições aplicáveis.",
  },
  {
    eyebrow: "Seu imóvel preservado",
    title: "Nada para instalar",
    description: "Você não precisa colocar placas solares ou fazer obras no imóvel.",
  },
  {
    eyebrow: "Primeiro passo",
    title: "Análise sem custo",
    description: "Verifique gratuitamente se sua conta pode seguir para avaliação.",
  },
] as const;

export const processSteps = [
  {
    title: "Você verifica sua conta",
    description: "Responda a algumas perguntas rápidas sobre a unidade consumidora.",
  },
  {
    title: "Analisamos as informações",
    description: "A pré-qualificação organiza os dados para uma avaliação inicial.",
  },
  {
    title: "Confirmamos as condições",
    description: "Elegibilidade, distribuidora e regras aplicáveis são conferidas.",
  },
  {
    title: "Você recebe orientação",
    description: "Se houver aderência, explicamos com clareza como continuar.",
  },
] as const;

export const benefits = [
  {
    title: "Sem investimento inicial",
    description: "Comece pela análise da conta, sem comprar um sistema solar.",
  },
  {
    title: "Sem instalação no imóvel",
    description: "Nenhuma placa, obra ou equipamento adicional na sua propriedade.",
  },
  {
    title: "Economia recorrente",
    description: "Benefício sujeito às condições aplicáveis à unidade consumidora.",
  },
  {
    title: "Fonte renovável",
    description: "Energia compartilhada produzida a partir de geração renovável.",
  },
  {
    title: "Processo inicial simples",
    description: "Uma jornada curta para entendermos o perfil da sua conta.",
  },
] as const;

export const savingsClaim = "Até 15% de desconto na energia injetada*";

export const savingsDisclaimer =
  "*Percentual e economia efetiva dependem das condições da unidade consumidora, distribuidora, contrato e regras aplicáveis.";

export const faqItems = [
  {
    question: "Preciso instalar placas solares?",
    answer:
      "Não. A proposta utiliza energia compartilhada, sem instalação de placas solares no imóvel.",
  },
  {
    question: "Minha distribuidora de energia muda?",
    answer:
      "Não. A distribuidora local continua responsável pela rede e pelo fornecimento físico de energia.",
  },
  {
    question: "Qualquer conta pode participar?",
    answer:
      "Não necessariamente. A elegibilidade depende da unidade consumidora, do estado, da distribuidora e das regras aplicáveis.",
  },
  {
    question: "A economia começa imediatamente?",
    answer:
      "Não necessariamente. A análise, a confirmação das condições e as etapas de adesão acontecem antes da compensação.",
  },
  {
    question: "Como sei se minha conta é elegível?",
    answer:
      "Comece pela pré-qualificação. Depois, as informações e condições da conta serão conferidas antes de qualquer orientação de adesão.",
  },
  {
    question: "Existe algum investimento inicial?",
    answer:
      "A análise inicial é gratuita e a solução não exige a compra ou instalação de placas solares no imóvel.",
  },
] as const;

export const primaryCtas = [
  { location: "header", label: "Verificar minha conta", href: QUALIFICATION_TARGET },
  { location: "hero", label: "Verificar minha conta", href: QUALIFICATION_TARGET },
  { location: "savings", label: "Verificar minha conta", href: QUALIFICATION_TARGET },
  { location: "final", label: "Analisar minha conta", href: QUALIFICATION_TARGET },
] as const;
