import { LegalPage, LegalSection } from '@/components/PublicLayout'
import { COMPANY_NAME, SUPPORT_EMAIL } from '@/lib/plan'

export default function Privacy() {
  return (
    <LegalPage title="Política de privacidade" updated="9 de outubro de 2026">
      <LegalSection title="1. Quem cuida dos seus dados">
        <p>
          O Audite é oferecido por {COMPANY_NAME}, que é a controladora dos dados pessoais tratados no serviço, nos
          termos da Lei Geral de Proteção de Dados (Lei 13.709/2018). Contato para assuntos de privacidade:{' '}
          {SUPPORT_EMAIL}.
        </p>
      </LegalSection>

      <LegalSection title="2. Quais dados coletamos">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Cadastro:</strong> e-mail, senha (guardada de forma criptografada), nome da loja e, se você informar, seu nome e telefone.</li>
          <li><strong>Uso do serviço:</strong> as planilhas de estoque que você importa, os códigos e quantidades contados, categorias, cronograma e relatórios.</li>
          <li><strong>Pagamento:</strong> quando você assina, o pagamento é processado pelo Stripe. Não temos acesso ao número do seu cartão; recebemos apenas a situação da assinatura.</li>
          <li><strong>Dados técnicos:</strong> data e hora de acesso e registros necessários para a segurança do serviço.</li>
        </ul>
        <p>O Audite não usa cookies de publicidade nem ferramentas de rastreamento de terceiros.</p>
      </LegalSection>

      <LegalSection title="3. Para que usamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>Prestar o serviço contratado: guardar suas contagens e gerar os relatórios (execução de contrato).</li>
          <li>Cobrar a assinatura e emitir comprovantes (execução de contrato e obrigação legal).</li>
          <li>Enviar avisos sobre a conta, como confirmação de e-mail, recuperação de senha e fim do teste (execução de contrato).</li>
          <li>Proteger o serviço contra fraude e uso indevido (legítimo interesse).</li>
        </ul>
        <p>Não vendemos seus dados e não os usamos para publicidade.</p>
      </LegalSection>

      <LegalSection title="4. Com quem compartilhamos">
        <p>Apenas com fornecedores necessários para o serviço funcionar, que tratam os dados em nosso nome:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Supabase</strong> — banco de dados e autenticação, com servidores nos Estados Unidos.</li>
          <li><strong>Stripe</strong> — processamento de pagamentos.</li>
          <li><strong>Provedor de hospedagem</strong> do site e do aplicativo.</li>
        </ul>
        <p>
          Como alguns desses servidores ficam fora do Brasil, há transferência internacional de dados, feita com
          fornecedores que adotam padrões de segurança e cláusulas contratuais de proteção de dados.
        </p>
      </LegalSection>

      <LegalSection title="5. Por quanto tempo guardamos">
        <p>
          Enquanto sua conta existir. Ao excluir a conta, suas contagens, relatórios e dados de cadastro são
          apagados de imediato dos sistemas em uso e, das cópias de segurança, em até 30 dias. Registros de
          cobrança podem ser mantidos pelo prazo exigido pela legislação fiscal.
        </p>
      </LegalSection>

      <LegalSection title="6. Seus direitos">
        <p>Você pode, a qualquer momento:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>confirmar se tratamos seus dados e acessá-los;</li>
          <li>corrigir dados incompletos ou desatualizados, na tela de conta;</li>
          <li>baixar uma cópia de tudo, pelo botão “Baixar meus dados” na tela de conta;</li>
          <li>excluir sua conta e seus dados, pelo botão “Excluir conta”;</li>
          <li>pedir informações sobre o compartilhamento ou revogar consentimentos.</li>
        </ul>
        <p>
          Para qualquer pedido, escreva para {SUPPORT_EMAIL}. Respondemos em até 15 dias. Você também pode
          reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </LegalSection>

      <LegalSection title="7. Segurança">
        <p>
          O acesso é feito por conexão criptografada, as senhas não são guardadas em texto legível e cada cliente só
          consegue ler os próprios dados, por regra aplicada no banco de dados. Nenhum sistema é infalível: se
          houver um incidente que possa causar risco relevante a você, avisaremos você e a ANPD.
        </p>
      </LegalSection>

      <LegalSection title="8. Mudanças nesta política">
        <p>Mudanças relevantes são avisadas por e-mail ou dentro do aplicativo antes de valerem.</p>
      </LegalSection>
    </LegalPage>
  )
}
