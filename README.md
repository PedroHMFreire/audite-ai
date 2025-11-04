# Audite AI - Sistema de Auditoria de Estoque

Sistema profissional para gestão e auditoria de estoque com cronograma automatizado, categorização avançada e relatórios inteligentes.

## 🚀 Características Principais

### 📊 **Gestão de Contagens**
- Upload de planilhas (Excel/CSV) com análise automática
- Entrada manual de contagens com validação
- Comparação automática entre estoque teórico vs. contado
- Identificação de divergências (excessos/faltas)

### 🏷️ **Sistema de Categorias**
- Categorização flexível de produtos
- Cronograma automático com distribuição round-robin
- Configuração de períodos de contagem personalizados
- Calendário visual estilo Google Calendar

### 📈 **Relatórios e Analytics**
- Relatórios detalhados em PDF
- Exportação para Excel
- Gráficos interativos de divergências
- Histórico completo de contagens

### 🎯 **Sistema Comercial**
- Landing page profissional
- Teste gratuito de 7 dias
- Múltiplos planos de assinatura
- Sistema de trial management

## 💰 Planos e Preços

### Básico - R$ 29/mês
- Até 50 categorias
- 100 contagens/mês
- 1 usuário
- Relatórios básicos

### Profissional - R$ 59/mês
- Categorias ilimitadas
- Contagens ilimitadas
- Até 3 usuários
- Cronograma automático
- Relatórios avançados

### Premium - R$ 99/mês
- Tudo do Profissional
- Usuários ilimitados
- Múltiplas lojas
- API de integração
- Suporte 24/7

## 🛠️ Tecnologias

### Frontend
- **React 18** com TypeScript
- **Vite** para build otimizado
- **Tailwind CSS** para estilização
- **React Router** para navegação
- **Lucide React** para ícones
- **Recharts** para gráficos

### Backend
- **Supabase** (PostgreSQL + Auth)
- **Row Level Security (RLS)** para multi-tenant
- **Triggers automáticos** para perfis de usuário
- **Real-time subscriptions**

### Bibliotecas
- **jsPDF** para geração de relatórios
- **xlsx** para manipulação de planilhas
- **React Hook Form** para formulários
- **Sistema de Toast** personalizado

## 🚀 Instalação e Desenvolvimento

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta no Supabase

### Setup Local

```bash
# Clone o repositório
git clone <repository-url>
cd audite-ai

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env.local

# Configure Supabase
# Adicione suas chaves do Supabase no .env.local:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Execute o banco de dados
# Aplique o schema.sql no seu projeto Supabase

# Inicie o servidor de desenvolvimento
npm run dev
```

### Configuração do Supabase

1. Crie um novo projeto no Supabase
2. Execute o script `supabase/schema.sql` no SQL Editor
3. Configure as políticas RLS
4. Configure authentication providers
5. Adicione as chaves no arquivo `.env.local`

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── Charts.tsx      # Gráficos de divergências
│   ├── DashboardCards.tsx
│   ├── FileUpload.tsx  # Upload de planilhas
│   ├── Header.tsx      # Navegação + trial status
│   ├── Footer.tsx
│   ├── Logo.tsx
│   ├── ManualEntry.tsx # Entrada manual
│   ├── ThemeToggle.tsx # Dark/Light mode
│   └── Toast.tsx       # Sistema de notificações
├── pages/              # Páginas da aplicação
│   ├── Home.tsx        # Dashboard principal
│   ├── Login.tsx       # Autenticação
│   ├── Counts.tsx      # Lista de contagens
│   ├── CountDetail.tsx # Detalhes da contagem
│   ├── Report.tsx      # Visualização de relatórios
│   ├── Categories.tsx  # Gestão de categorias
│   ├── ScheduleConfig.tsx    # Configuração cronograma
│   ├── ScheduleCalendar.tsx  # Calendário visual
│   ├── LandingPage.tsx       # Página comercial
│   ├── TrialSignup.tsx       # Cadastro trial
│   └── TrialWelcome.tsx      # Boas-vindas trial
├── lib/                # Utilitários e serviços
│   ├── supabaseClient.ts     # Cliente Supabase
│   ├── db.ts                 # Operações banco
│   ├── pdf.ts                # Geração PDF
│   ├── trial.ts              # Gestão trial
│   └── utils.ts              # Funções utilitárias
└── styles.css          # Estilos globais
```

## 🔐 Segurança e Multi-tenant

### Row Level Security (RLS)
- Todas as tabelas protegidas por RLS
- Usuários veem apenas seus próprios dados
- Políticas automáticas por user_id

### Gestão de Trial
- Perfis automáticos na criação de usuário
- Tracking de status de trial
- Validação de datas de expiração
- Sistema de upgrade automático

## 🎯 Fluxo do Usuário

### 1. Landing Page
- Apresentação do produto
- Pricing transparente
- CTA para trial gratuito
- Depoimentos e funcionalidades

### 2. Trial Signup
- Formulário com dados da loja
- Seleção de plano
- Criação automática de conta
- Email de confirmação

### 3. Onboarding
- Página de boas-vindas
- Instruções de primeiro uso
- Links para configuração
- Status do trial

### 4. Aplicação Principal
- Dashboard com métricas
- Upload de planilhas
- Gestão de categorias
- Relatórios e cronograma

## 📊 Funcionalidades Avançadas

### Cronograma Automático
- Algoritmo round-robin para distribuição
- Configuração flexível de períodos
- Prevenção de duplicatas mensais
- Calendário visual interativo

### Sistema de Relatórios
- PDF com logo e informações completas
- Excel exportável com fórmulas
- Gráficos de divergências
- Histórico temporal

### Analytics
- Métricas de uso por categoria
- Tendências de divergências
- Performance de contagens
- Insights automáticos

## 🔄 Deploy e Produção

### Build para Produção
```bash
npm run build
```

### Variáveis de Ambiente
```env
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
```

### Checklist de Deploy
- [ ] Supabase configurado em produção
- [ ] RLS policies aplicadas
- [ ] Auth providers configurados
- [ ] Domínio personalizado
- [ ] SSL/HTTPS habilitado
- [ ] Backup automático
- [ ] Monitoring configurado

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob licença MIT. Veja o arquivo LICENSE para detalhes.

## 📞 Suporte

- Email: suporte@audite-ai.com
- WhatsApp: (11) 9999-9999
- Documentação: docs.audite-ai.com

---

**Audite AI** - Transformando a gestão de estoque com tecnologia e inteligência. 🚀

## Como rodar

1. Clone/extraia o projeto e entre na pasta.
2. Crie o arquivo `.env` na raiz com:
   ```env
   VITE_SUPABASE_URL=xxxx
   VITE_SUPABASE_ANON_KEY=xxxx
   ```
3. Instale dependências e rode:
   ```bash
   npm install
   npm run dev
   ```

> **Importante:** configure seu banco Supabase com as tabelas e políticas abaixo (arquivo `supabase/schema.sql`).

## Fluxo
- Envie planilha (colunas **código, nome, saldo**).
- Insira manualmente os códigos encontrados no estoque físico (um Enter por item).
- Finalize a contagem → o sistema classifica itens em **Regulares**, **Excesso** e **Falta** e gera **Relatório** (web + PDF).

## Estrutura
- **Login** (e-mail/senha com Supabase Auth)
- **Home** (dashboards, iniciar contagem, últimas 5)
- **Contagens** (lista com busca e carregar mais)
- **Detalhe da contagem** (upload + inserção manual + finalizar)
- **Relatório** (visual + exportar PDF)
- **Tema claro/escuro** com alternância no topo

## Observações
- Classificação segue fielmente sua especificação:
  - **Regular**: aparece na planilha e quantidade inserida **igual** ao saldo.
  - **Excesso**: inserido manualmente, **não** existe na planilha.
  - **Falta**: existe na planilha e **zero** inserções do código.
  - Casos parciais (**inserções > 0 e < saldo**) não são classificados (poderemos adicionar depois).
- Opcional: criar um bucket **reports** no Supabase Storage para guardar PDFs; o app já baixa localmente.

## Licença
MIT
