# AUDITE.AI

Sistema de auditoria mobile-first para lojas de roupa.

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
