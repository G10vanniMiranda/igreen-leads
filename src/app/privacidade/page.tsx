import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade | Conexão Green",
  description: "Como os dados da solicitação de análise são tratados no iGreen Leads.",
};

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <article className="privacy-document">
        <Link href="/" className="privacy-back">← Voltar ao início</Link>
        <p className="privacy-kicker">Transparência</p>
        <h1>Política de Privacidade</h1>
        <p className="privacy-updated">Versão operacional de 14 de agosto de 2026.</p>
        <p>
          Esta política descreve o funcionamento atual do iGreen Leads. Ela não substitui aconselhamento jurídico e não declara conformidade absoluta com a LGPD.
        </p>

        <h2>Dados tratados</h2>
        <p>
          A pré-qualificação trata respostas sobre a unidade consumidora, como tipo, estado, distribuidora, faixa da conta, titularidade e benefício social. Quando você solicita continuidade, também tratamos nome, WhatsApp, consentimento de contato e dados de origem da visita, como UTMs, página de entrada e referrer.
        </p>

        <h2>Finalidades</h2>
        <p>
          Usamos esses dados para realizar a pré-análise solicitada, registrar a solicitação, avaliar as informações fornecidas e entrar em contato sobre esse atendimento. O consentimento de contato não autoriza newsletter, mailing, publicidade genérica, venda de dados, analytics ou remarketing.
        </p>

        <h2>Fatura de energia</h2>
        <p>
          Se você optar por enviar uma fatura, tratamos o arquivo e metadados técnicos mínimos para análise e continuidade do atendimento. O arquivo fica em armazenamento privado e seu acesso operacional é temporário e restrito. Não há antivírus ou análise automática de malware nesta versão.
        </p>

        <h2>Armazenamento local, analytics e publicidade</h2>
        <p>
          Um identificador aleatório de jornada e a atribuição inicial podem ser mantidos no armazenamento da sessão para preservar o fluxo. Suas preferências ficam no armazenamento local, sem nome ou telefone. Analytics e publicidade começam desativados e só podem operar após escolha explícita e quando a integração estiver configurada em ambiente autorizado.
        </p>

        <h2>Compartilhamento e continuidade</h2>
        <p>
          Dados podem ser processados por prestadores de infraestrutura necessários à hospedagem, banco e armazenamento. Quando o operador abre a continuidade oficial da solução iGreen, o link não inclui PII; qualquer avanço externo depende da ação operacional e do contexto apresentado. Os papéis jurídicos entre as partes ainda precisam de análise específica antes da operação pública.
        </p>

        <h2>Segurança e retenção</h2>
        <p>
          Aplicamos controles técnicos proporcionais, incluindo validação, armazenamento privado, autenticação administrativa, logs minimizados e limitação básica contra abuso. Nenhum sistema é isento de risco. A política definitiva de retenção será definida antes de Production e os dados não devem ser mantidos além da finalidade aprovada.
        </p>

        <h2>Seus direitos e preferências</h2>
        <p>
          Solicitações futuras poderão envolver acesso, correção, exclusão e revogação, conforme avaliação da identidade, do contexto e das obrigações aplicáveis. Você pode alterar ou revogar preferências de analytics e publicidade a qualquer momento pelo link “Preferências de cookies”. A revogação impede novos eventos, mas não promete apagar retroativamente dados já enviados a terceiros.
        </p>

        <h2>Canal de privacidade</h2>
        <p>
          Um canal específico para solicitações de privacidade será disponibilizado antes da operação pública. A ausência desse canal é um bloqueio para Production Readiness.
        </p>
      </article>
    </main>
  );
}
