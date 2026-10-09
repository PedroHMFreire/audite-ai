import { Link } from 'react-router-dom'
import { LegalPage, LegalSection } from '@/components/PublicLayout'
import { COMPANY_NAME, PLAN, SUPPORT_EMAIL } from '@/lib/plan'

export default function Terms() {
  return (
    <LegalPage title="Termos de uso" updated="9 de outubro de 2026">
      <LegalSection title="1. O que é o Audite">
        <p>
          O Audite é um serviço online de contagem e conferência de estoque para lojas, oferecido por {COMPANY_NAME}
          {' '}(“nós”). Ao criar uma conta você concorda com estes termos e com a{' '}
          <Link to="/privacidade" className="link">política de privacidade</Link>.
        </p>
      </LegalSection>

      <LegalSection title="2. Sua conta">
        <p>
          Você precisa informar um e-mail válido e manter sua senha em sigilo. Cada conta atende a uma loja e a um
          usuário. Você é responsável pelo que for feito com a sua conta e pelos dados que colocar no serviço.
        </p>
      </LegalSection>

      <LegalSection title="3. Período de teste e assinatura">
        <p>
          Toda conta nova tem {PLAN.trialDays} dias de teste gratuito, sem cartão de crédito. Ao fim do teste, para
          continuar criando e editando contagens é preciso assinar o plano, cobrado mensalmente no valor informado
          na tela de assinatura no momento da contratação.
        </p>
        <p>
          A assinatura se renova automaticamente a cada mês até ser cancelada. Você pode cancelar a qualquer momento
          na tela de assinatura; o acesso continua até o fim do período já pago e não há multa. Se você contratou
          pela internet, pode desistir em até 7 dias da contratação e receber de volta o valor pago, conforme o
          art. 49 do Código de Defesa do Consumidor: basta escrever para {SUPPORT_EMAIL}.
        </p>
        <p>
          Mudanças de preço são avisadas por e-mail com pelo menos 30 dias de antecedência e só valem a partir da
          renovação seguinte.
        </p>
      </LegalSection>

      <LegalSection title="4. Sem assinatura ativa">
        <p>
          Se o teste terminar ou a assinatura for encerrada, você continua podendo consultar e exportar suas
          contagens e relatórios, mas não pode criar nem alterar contagens. Contas sem assinatura e sem acesso por
          mais de 12 meses podem ser excluídas, com aviso prévio por e-mail.
        </p>
      </LegalSection>

      <LegalSection title="5. Seus dados">
        <p>
          As planilhas, contagens e relatórios que você coloca no Audite são seus. Usamos esses dados apenas para
          prestar o serviço. Você pode baixar uma cópia ou excluir sua conta a qualquer momento na tela de conta.
        </p>
      </LegalSection>

      <LegalSection title="6. Uso adequado">
        <p>
          Não é permitido usar o serviço para fins ilegais, tentar acessar dados de outros clientes, burlar limites
          técnicos ou de cobrança, ou sobrecarregar a plataforma de propósito. Podemos suspender contas que violem
          estas regras.
        </p>
      </LegalSection>

      <LegalSection title="7. Disponibilidade e limites">
        <p>
          Trabalhamos para manter o Audite no ar e seus dados seguros, mas o serviço pode ficar indisponível por
          manutenção ou por falhas de terceiros. O Audite é uma ferramenta de apoio à conferência: o resultado
          depende da planilha que você importa e da contagem que você faz. Não nos responsabilizamos por decisões
          comerciais, fiscais ou contábeis tomadas com base nos relatórios. Na medida permitida pela lei, nossa
          responsabilidade fica limitada ao valor pago por você nos 12 meses anteriores ao fato.
        </p>
      </LegalSection>

      <LegalSection title="8. Mudanças nestes termos">
        <p>
          Podemos atualizar estes termos. Mudanças relevantes são avisadas por e-mail ou dentro do aplicativo antes
          de entrarem em vigor.
        </p>
      </LegalSection>

      <LegalSection title="9. Lei aplicável e contato">
        <p>
          Estes termos seguem as leis brasileiras. Dúvidas e solicitações: {SUPPORT_EMAIL}.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
