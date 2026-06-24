# 🧪 Plano de Teste — Auditê

Objetivo: deixar a operação 100%. Marque cada item ao validar. Prioridades:
**P0** = quebra a operação · **P1** = importante · **P2** = secundário.

> Verificações automáticas (nível de banco) já executadas em 2026-06-24 estão
> na seção "Resultados automáticos" no fim — todas verdes.

---

## 🔥 Smoke test (5 min — caminho crítico)
- [ ] **Abrir uma contagem EXISTENTE em andamento → abre sem erro** (regressão do bug de UUID corrigido em 2026-06-24).
- [ ] Criar contagem nova de teste.
- [ ] Subir planilha pequena: `A=10`, `B=5`, `C=8`.
- [ ] Contar (scan ou manual): `A`×10, `B`×3, e um código `D` fora do plano ×2.
- [ ] Finalizar e abrir relatório.
- [ ] **Esperado:** A=Regular · B=Falta(2) · C=Falta(8, não contado) · D=Excesso(2).
- [ ] PDF exporta com os mesmos números.

---

## P0 — Crítico

### 0. Navegação e validações de front (regressão)
- [ ] Abrir contagem existente (em andamento / finalizada / reaberta) — sem "ID inválido".
- [ ] Abrir relatório de contagem existente — sem erro de ID.
- [ ] URL com id malformado → redireciona com mensagem clara (não quebra a tela).

### 1. Cruzamento / matemática
- [ ] Regular/Falta/Excesso conforme tabela do smoke.
- [ ] Escanear o mesmo código 3× → quantidade soma para 3 (não cria 3 linhas).
- [ ] **Plano grande (>1000 itens)**: finalizar pelo app → relatório traz TODOS os códigos (sem cortar em 1000). *(coberto pelo teste de carga `c`)*
- [ ] Plano vazio + itens → tudo Excesso.
- [ ] Planilha cheia + nada contado → tudo Falta.
- [ ] Quantidade manual grande (ex.: 500 de uma vez) → soma certa.

### 2. Offline / sincronização
- [ ] Modo avião no meio da contagem → escanear vários → status "Offline".
- [ ] Reativar rede → status "Tudo salvo"; nada perdido; sem duplicação.
- [ ] Fechar o app offline com fila pendente → reabrir → fila persiste (IndexedDB) → sincroniza.
- [ ] Finalizar logo após reconectar → results corretos.

### 3. Segurança multi-tenant (RLS)
- [ ] Usuário B não vê contagens de A (na lista).
- [ ] Usuário B não abre `/relatorio/{id}` de A (sem dados).
- [ ] Dashboard de categorias/cronograma só mostra dados do próprio dono.
- [ ] `anon` não chama RPCs nem lê tabelas. *(automatizado ✅)*

### 4. Relatórios
- [ ] Números batem com a contagem.
- [ ] Sinal da diferença correto (encontrado − esperado).
- [ ] PDF exporta com valores certos.
- [ ] Relatório de contagem grande mostra todas as linhas.

---

## P1 — Importante

### 5. Scanner de código de barras
- [ ] **Android/Chrome** (motor nativo): lê EAN-13/Code-128.
- [ ] **iPhone/Safari** (motor ZXing): abre e lê.
- [ ] Sem permissão de câmera → mensagem clara + fallback manual.
- [ ] Lanterna (se o aparelho suportar).
- [ ] Leitura contínua: mesmo código em <1,2s não duplica.
- [ ] Código fora do plano → feedback âmbar.

### 6. Edição / ações
- [ ] Editar um código para outro já existente → mescla quantidades (sem erro).
- [ ] Undo (desfazer) → reduz/zera o total da última leitura.
- [ ] Remover item → sai da lista e do total.
- [ ] Reabrir contagem finalizada → results limpos, status "reaberta"; recontar e refinalizar funciona.

### 7. Auth / trial
- [ ] Signup cria perfil (`user_profiles`) e papel padrão (`user_roles`). *(coberto pelo teste de carga `c`)*
- [ ] Login/logout; rota protegida redireciona para /login.
- [ ] Trial: datas corretas; após expirar, bloqueia o uso.

### 8. Responsivo / dispositivo
- [ ] Mobile / tablet / desktop com layout correto.
- [ ] Barra de ação fixa respeita o notch (safe-area) no iPhone.
- [ ] Teclado mobile não cobre o campo de código.

---

## P2 — Secundário
- [ ] Categorias: criar / cor / editar / excluir.
- [ ] Cronograma: gerar itens, ver no calendário.
- [ ] Notificações: preferências salvam.
- [ ] PWA: instala e abre offline.
- [ ] Padronizar rótulo de status (`EM ANDAMENTO` vs `em_andamento`) — cosmético.

---

## ✅ Resultados automáticos (2026-06-24, nível de banco — read-only)

| Verificação | Resultado |
|---|---|
| Recálculo das 17 contagens finalizadas vs. `results` salvos | **0 divergências** |
| Códigos duplicados no plano | 0 |
| Entradas duplicadas (UNIQUE) | 0 |
| Results órfãos | 0 |
| `anon` → RPC `admin_list_users_with_roles` | 401 bloqueado |
| `anon` → RPC `compute_count_results` | 401 bloqueado |
| `anon` → ler `counts` (RLS) | `[]` (não vaza) |
| `anon` → ler view `category_stats` | permission denied |

Teste de carga end-to-end (>2000 itens, RPCs reais): ver `scripts/` / saída registrada na sessão.
