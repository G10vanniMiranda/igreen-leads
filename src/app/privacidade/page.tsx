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
        <p className="privacy-updated">Versão operacional de 17 de agosto de 2026.</p>
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
          Aplicamos controles técnicos proporcionais, incluindo validação, armazenamento privado, autenticação administrativa, logs minimizados e limitação básica contra abuso. Nenhum sistema é isento de risco.
        </p>
        <p>
          Como política operacional inicial do produto, leads sem avanço e suas faturas são mantidos por até 90 dias após a última interação. Faturas de leads concluídos ou encaminhados são mantidas por até 90 dias após a conclusão operacional, salvo necessidade legítima específica. Eventos de auditoria operacional são mantidos por 12 meses, e notas internas seguem o mesmo prazo aplicável ao lead. Esses são prazos operacionais definidos para este produto, não prazos legais universais.
        </p>

        <h2>Seus direitos e preferências</h2>
        <p>
          Solicitações de acesso, correção, exclusão e revogação, quando aplicável, serão avaliadas após verificação proporcional da identidade e do contexto. Solicitações válidas de exclusão serão executadas quando não houver motivo legítimo para retenção. Você pode alterar ou revogar preferências de analytics e publicidade a qualquer momento pelo link “Preferências de cookies”. A revogação impede novos eventos, mas não promete apagar retroativamente dados já enviados a terceiros.
        </p>

        <h2>Canal de privacidade</h2>
        <p>
          Para solicitações relacionadas a dados pessoais no lançamento inicial, entre em contato pelo e-mail <a href="mailto:giovannimiranda09@gmail.com">giovannimiranda09@gmail.com</a>. Este endereço é somente o canal oficial de contato para privacidade; sua publicação não atribui função de encarregado, controlador ou operador ao titular da conta.
        </p>
      </article>
    </main>
  );
}
