# Justificativa de Divergências de Contagem

Data: 2026-07-09

## Problema

Toda contagem de estoque gera divergências entre o que o sistema espera (`plan_items`/`saldo_qtd`) e o que foi contado fisicamente (`manual_entries`/`manual_qtd`), classificadas na tabela `results` como `excesso` (sobra física) ou `falta` (falta física). Hoje essas divergências são exibidas (tela de relatório e PDF) sem nenhum registro de causa. A loja precisa justificar cada divergência com um motivo, para responsabilização e histórico.

## Decisões de escopo

- Justificativa é **opcional**: a contagem pode ser finalizada e o relatório gerado mesmo com itens divergentes sem justificativa.
- Preenchimento por **qualquer usuário** com acesso à contagem (não há hoje diferenciação de papel gerente/vendedor dentro do fluxo de contagem — ver seção "Papéis" abaixo).
- Granularidade: **uma justificativa por item individual** (por `código` divergente dentro da contagem), sem preenchimento em lote.
- Preenchida **somente na tela de Relatório** (`Report.tsx`), não em `CountDetail.tsx`.
- Itens sem justificativa aparecem com destaque **"Pendente"**, tanto na tela quanto no PDF.
- No PDF, a justificativa é uma **coluna extra** na mesma tabela de itens divergentes já existente (não uma seção separada).

## Motivos disponíveis

1. Falha na Troca (`falha_troca`)
2. Erro de Inserção (`erro_insercao`)
3. Duplicada no Sistema (`duplicada_sistema`)
4. Código Errado (`codigo_errado`)
5. Outra (`outra`) — exige uma linha de observação livre

## Arquitetura de dados

### Por que uma tabela separada (não colunas em `results`)

A RPC `compute_count_results()` faz `DELETE + INSERT` em `results` toda vez que a contagem é (re)computada, e `reopenCount()` (`src/lib/db.ts`) apaga todos os `results` de uma contagem ao reabri-la. Se a justificativa vivesse em `results`, seria perdida nesse processo. Por isso a justificativa fica em tabela própria, chaveada por `(count_id, codigo)` — uma chave estável que sobrevive a recomputações — e não por `result_id`.

Alternativas descartadas:
- Colunas dentro de `results`: quebra ao reabrir/recomputar a contagem.
- Tabela genérica de "audit log" reutilizável para outras finalidades: over-engineering para o que foi pedido.

### Nova migration

```sql
create table divergence_justifications (
  id uuid primary key default gen_random_uuid(),
  count_id uuid not null references counts(id) on delete cascade,
  codigo text not null,
  motivo text not null check (motivo in (
    'falha_troca', 'erro_insercao', 'duplicada_sistema', 'codigo_errado', 'outra'
  )),
  observacao text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (count_id, codigo),
  check (motivo <> 'outra' or observacao is not null)
);

alter table divergence_justifications enable row level security;

create policy "owner can select justifications"
  on divergence_justifications for select
  using (exists (
    select 1 from counts c
    where c.id = divergence_justifications.count_id
      and c.user_id = auth.uid()
  ));

create policy "owner can insert justifications"
  on divergence_justifications for insert
  with check (exists (
    select 1 from counts c
    where c.id = divergence_justifications.count_id
      and c.user_id = auth.uid()
  ));

create policy "owner can update justifications"
  on divergence_justifications for update
  using (exists (
    select 1 from counts c
    where c.id = divergence_justifications.count_id
      and c.user_id = auth.uid()
  ));
```

O `check (motivo <> 'outra' or observacao is not null)` garante no banco que "Outra" sempre venha com texto — reforçado também na UI.

### Papéis (nota de escopo)

O modelo atual (`counts.user_id`) não distingue "gerente" de "vendedor" dentro do fluxo de contagem — cada contagem pertence a um único usuário dono, e as RLS existentes de `counts`/`plan_items`/`manual_entries`/`results` já seguem esse padrão de "dono only". A RLS de `divergence_justifications` acima replica essa mesma regra. Portanto "qualquer usuário da loja" hoje equivale, na prática, a "o dono da contagem". Introduzir colaboração multiusuário numa mesma contagem (papéis reais gerente/vendedor) é um projeto à parte, fora do escopo desta feature.

## Backend (`src/lib/db.ts`)

Duas funções novas, seguindo o padrão das funções existentes no arquivo:

- `getJustifications(countId: string): Promise<DivergenceJustification[]>` — `select *` de `divergence_justifications` filtrado por `count_id`.
- `upsertJustification(countId: string, codigo: string, motivo: Motivo, observacao?: string): Promise<void>` — `insert ... on conflict (count_id, codigo) do update set motivo = excluded.motivo, observacao = excluded.observacao, updated_at = now()`.

Tipo `Motivo = 'falha_troca' | 'erro_insercao' | 'duplicada_sistema' | 'codigo_errado' | 'outra'`.

## UI (`src/pages/Report.tsx`)

Nas seções "Excesso" e "Falta" da tabela de resultados (a seção "Regular" fica inalterada, pois não há divergência a justificar), cada linha ganha:

- Um `<select>` (ou componente shadcn equivalente) com os 5 motivos, rotulado pelo texto por extenso.
- Um campo de texto de uma linha, exibido apenas quando "Outra" está selecionado, para a observação livre.
- Um badge "Pendente" (reaproveitando visualmente o padrão de `StatusDot` já usado em `CountDetail.tsx`) enquanto não houver `divergence_justifications` salva para aquele código; o badge some assim que houver motivo salvo.

Carregamento: ao montar a tela, `getJustifications(countId)` busca todas as justificativas existentes da contagem e popula os selects/observações já preenchidos (permitindo edição).

Salvamento: ao trocar o motivo (e, no caso de "Outra", ao sair do campo de observação) chama `upsertJustification` diretamente — sem necessidade de um botão "salvar tudo".

Validação: se "Outra" for selecionado e a observação estiver vazia, não salva e mostra um erro inline (evita hit no `check` do banco).

## PDF (`src/lib/pdf.ts`)

Nas tabelas de "Excesso" e "Falta" dentro de `generateReportPDF()`, adicionar uma coluna "Justificativa":
- Se existir registro em `divergence_justifications` para o código: rótulo do motivo por extenso + `" — " + observacao` quando houver.
- Se não existir: texto "Pendente".

Isso exige passar as justificativas (já carregadas por `getJustifications`) como argumento adicional para `generateReportPDF()`, e ajustar a largura das colunas existentes para acomodar a nova coluna.

## Edge cases

- **Reabrir contagem** (`reopenCount`): apaga `results` mas não `divergence_justifications` — a justificativa sobrevive à reabertura.
- **Recontagem que faz o item deixar de divergir**: a justificativa antiga não é exibida (só mostramos justificativa ao lado de itens presentes nas seções Excesso/Falta), mas o registro permanece no banco sem necessidade de limpeza ativa — é inofensivo.
- **Recontagem que faz o item voltar a divergir**: a justificativa antiga (mesma `codigo` + `count_id`) reaparece pré-preenchida e editável.

## Fora de escopo

- Diferenciação de papéis gerente/vendedor dentro do fluxo de contagem (ver seção "Papéis" acima).
- Justificativa obrigatória para finalizar a contagem (decidido como não obrigatória nesta versão).
- Preenchimento em lote de múltiplos itens de uma vez.
- Preenchimento da justificativa na tela `CountDetail.tsx`.
