## 🧪 GUIA COMPLETO DE TESTE - LÓGICA DE CONTAGEM

### ✅ CHECKLIST DE FUNCIONALIDADES

#### **1. FASE DE PLANILHA**
- [ ] Enviar arquivo CSV com colunas: CODIGO | NOME | SALDO
- [ ] Validar que planilha foi carregada (cards mostram quantidade de códigos)
- [ ] Erro ao enviar arquivo vazio
- [ ] Erro ao enviar arquivo com colunas incorretas
- [ ] Planilha pode ser substituída (não gera erro ao reenviar)

#### **2. FASE DE INSERÇÃO MANUAL**
- [ ] Adicionar código que está na planilha → sucesso
- [ ] Adicionar código que NÃO está na planilha → warning
- [ ] Adicionar quantidade > 1 → funciona corretamente
- [ ] Listar itens inseridos com zebra-stripe alternado
- [ ] Editar item existente:
  - [ ] Clicar "Editar"
  - [ ] Mudar código
  - [ ] Mudar quantidade
  - [ ] Clicar "✓" para salvar
- [ ] Remover item existente:
  - [ ] Clicar "Remover"
  - [ ] Confirmar exclusão
  - [ ] Item desaparece da lista

#### **3. VISIBILIDADE DE PROGRESSÃO**
- [ ] Cards de resumo mostram:
  - [ ] Planilha • Códigos (total de códigos)
  - [ ] Planilha • Itens (total de itens esperados)
  - [ ] Inseridos • Códigos (códigos contados)
  - [ ] Inseridos • Itens (itens contados)
- [ ] Barra de cobertura mostra:
  - [ ] Progresso em dois eixos (Códigos e Itens)
  - [ ] Cores: azul (progresso) ou verde (completo)
  - [ ] Porcentagem correta
  - [ ] Contador de itens faltantes em laranja

#### **4. CATEGORIAS DE STATUS**
- [ ] Card "Regulares": mostra quantidade de produtos contados corretamente
- [ ] Card "Excesso": mostra quantidade de produtos encontrados a mais
- [ ] Card "Falta": mostra quantidade de produtos que faltam

#### **5. MODAL DE CONFIRMAÇÃO**
- [ ] Clicar "Finalizar contagem" sem planilha → erro toast
- [ ] Clicar "Finalizar contagem" sem itens → erro toast
- [ ] Clicar "Finalizar contagem" com dados válidos → abre modal
- [ ] Modal mostra:
  - [ ] Códigos esperados vs. inseridos
  - [ ] Itens esperados vs. inseridos
  - [ ] Barras de progresso
  - [ ] Warning se cobertura < 100%
  - [ ] Botão "Cancelar" mantém modal aberto
- [ ] Cancelar modal → volta ao formulário

#### **6. FINALIZAÇÃO E CÁLCULO**
- [ ] Clicar "Confirmar Finalização" → processa
- [ ] Com planilha correta + entradas → calcula resultados:
  - ✓ **REGULAR**: Esperado = Encontrado
  - ✓ **FALTA**: Esperado > Encontrado
  - ✓ **EXCESSO**: Esperado < Encontrado OU código não estava na planilha
  - ✓ **DIFERENÇA**: Calcula |Esperado - Encontrado|
- [ ] Após sucesso → navega automática para /relatorio/{id}

#### **7. RELATÓRIO**
- [ ] Página de relatório carrega corretamente
- [ ] Mostra três tabelas:
  - [ ] Produtos Regulares
  - [ ] Produtos em Excesso
  - [ ] Produtos em Falta
- [ ] Cada tabela tem:
  - [ ] Header com tooltips explicativos
  - [ ] Zebra-stripe alternado (cores)
  - [ ] Color-coding da linha (verde=regular, vermelho=falta, azul=excesso)
  - [ ] Coluna "Diferença" com cálculo correto
  - [ ] Alinhamento apropriado (números à direita)
  - [ ] Hover effect suave
- [ ] Barra de cobertura no topo
- [ ] Cards de resumo com totais
- [ ] Botão "Exportar PDF" funciona

---

### 🔧 TESTE MANUAL PASSO A PASSO

#### **Cenário 1: Contagem Simples e Correta**
```
1. Criar nova contagem: "Teste Simples"
2. Enviar planilha com 5 códigos:
   P001, Produto A, 10
   P002, Produto B, 5
   P003, Produto C, 8
   P004, Produto D, 3
   P005, Produto E, 2

3. Inserir manualmente:
   P001: 10 unidades (REGULAR)
   P002: 3 unidades (FALTA - esperado 5, encontrado 3)
   P003: 12 unidades (EXCESSO - esperado 8, encontrado 12)
   P004: 0 unidades (FALTA - esperado 3, encontrado 0)
   P005: 2 unidades (REGULAR)
   P999: 5 unidades (EXCESSO - não está na planilha)

4. Verificar cards:
   - Planilha: 5 códigos, 28 itens
   - Inseridos: 5 códigos, 32 itens
   - Regulares: 2
   - Excesso: 2 (P999 + P003)
   - Falta: 2 (P002 + P004)

5. Clicar "Finalizar contagem"
6. Confirmar no modal
7. Aguardar redirecionamento para relatório

8. No relatório, verificar:
   - Regulares: P001 (diferença 0), P005 (diferença 0)
   - Excesso: P003 (+4), P999 (+5)
   - Falta: P002 (-2), P004 (-3)
   - Diferenças calculadas corretamente
```

#### **Cenário 2: Contagem Incompleta (com Warnings)**
```
1. Criar nova contagem: "Teste Incompleto"
2. Enviar planilha com 3 códigos
3. Inserir apenas 1 código
4. Barra de cobertura deve mostrar ~33%
5. Modal deve mostrar warning "⚠️ Contagem incompleta"
6. Mesmo assim deve permitir finalizar
7. Resultado deve conter códigos não adicionados como "FALTA"
```

#### **Cenário 3: Múltiplas Entradas do Mesmo Código**
```
1. Criar nova contagem
2. Enviar planilha: P001, Produto A, 10
3. Inserir 3 vezes o código P001:
   - Primeira: qty = 3
   - Segunda: qty = 4
   - Terceira: qty = 3
4. Total esperado: 3+4+3 = 10 (REGULAR)
5. Verificar que agregou corretamente:
   - Inseridos • Itens: 10
   - Card de "Itens inseridos" mostra 3 entradas
   - Mas relatório mostra 1 linha com 10 unidades
```

---

### 🐛 SE HOUVER ERRO NA FINALIZAÇÃO

#### **Console.log esperado após sucesso:**
```
🔄 Iniciando finalização da contagem...
📊 Calculando resultados...
✓ Contagem finalizada com sucesso! X resultados salvos
```

#### **Se houver erro, procurar:**
```
❌ Erro ao finalizar: [mensagem específica]
```

#### **Problemas comuns e soluções:**

| Erro | Solução |
|------|---------|
| "Você não tem permissão para finalizar" | Check RLS no Supabase - count_id pertence ao user_id atual? |
| "Erro ao buscar planilha" | Verificar se plan_items existe para este count_id |
| "Erro ao buscar entradas" | Verificar se manual_entries existe e tem dados válidos |
| "Erro ao salvar resultados" | Verificar se tabela results existe e RLS permite inserção |
| "ID da contagem inválido" | Verificar formato do UUID em URL |

---

### 📊 VERIFICAÇÃO DE DADOS NO SUPABASE

Se suspeitar de problema, execute no SQL Console:

```sql
-- Verificar contagem
SELECT id, user_id, nome FROM counts WHERE id = '{count_id}';

-- Verificar planilha
SELECT count(*), SUM(saldo) FROM plan_items WHERE count_id = '{count_id}';

-- Verificar entradas
SELECT count(*), SUM(qty) FROM manual_entries WHERE count_id = '{count_id}';

-- Verificar resultados após finalização
SELECT status, count(*), SUM(diferenca) FROM results WHERE count_id = '{count_id}' GROUP BY status;
```

---

### ✅ TESTES AUTOMATIZADOS

Pode executar os testes de lógica:
```bash
npx ts-node src/tests/counting-logic-test.ts
```

Isso validará:
- ✓ Lógica de status (regular/falta/excesso)
- ✓ Agregação correta de múltiplas entradas
- ✓ Cálculo de diferença
- ✓ Casos extremos (planilha vazia, quantidade zero, etc.)

---

### 📋 RESUMO DE CORREÇÕES APLICADAS

1. **Validação de Segurança** (RLS)
   - Agora valida que count_id pertence ao user_id atual
   - Impede acesso não autorizado

2. **Logging Melhorado**
   - Console mostra passos da finalização
   - Facilita debug de problemas

3. **Tratamento de Erros Detalhado**
   - Mensagens específicas do Supabase
   - Diferencia tipos de erro

4. **Código Limpo**
   - Removido estado `saving` não utilizado
   - Melhorado fluxo da função handleFinalizarClick

Se após seguir este guia o erro persistir, capture a mensagem de erro exata do console e compartilhem!
