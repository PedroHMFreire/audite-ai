# 📱 Auditoria Mobile - Audite.AI

**Data**: 05 de Março de 2026  
**Status**: ⚠️ **Crítico** - Diversos problemas de responsividade e UX mobile identificados

---

## 🔴 BUGS CRÍTICOS (Devem ser corrigidos)

### 1. **Tabelas não escalam em mobile** ⚠️ CRÍTICO
**Arquivo**: `src/pages/Report.tsx` (linha ~197)  
**Problema**: 
- Tabelas com `text-sm` e padding `px-4 py-3` ficam muito apertadas em telas < 375px
- Colunas não têm responsive design - ficar impossível de ler
- Header sticky não funciona bem em mobile quando tabela tem scroll horizontal
- Sem breakpoint `sm:` para reduzir padding em mobile

**Impacto**: Relatório ilegível em celulares pequenos (iPhone SE, etc)

**Solução Recomendada**:
```tsx
// Implementar card layout em mobile em vez de tabela
// Ou: Ocultar colunas não essenciais em mobile
// Ou: Text size responsivo (text-xs em mobile, text-sm em desktop)
```

---

### 2. **ManualEntry com 3 colunas em mobile** ⚠️ CRÍTICO
**Arquivo**: `src/components/ManualEntry.tsx` (linha ~19)  
**Problema**:
```tsx
<form onSubmit={submit} className="grid grid-cols-3 gap-2 items-center">
```
- `grid-cols-3` = 3 colunas em telas pequenas
- Input "Código" e "Qtd" ficam muito estreitos (< 100px)
- Impossível digitar números com clareza em mobile
- Falta breakpoint `sm:grid-cols-1 md:grid-cols-3`

**Impacto**: Muito difícil adicionar itens em celular

**Solução**:
```tsx
className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-center"
```

---

### 3. **File Input label muito longo para mobile** ⚠️ ALTO
**Arquivo**: `src/components/FileUpload.tsx` (linha ~55)  
**Problema**:
```tsx
<span className="text-sm">Planilha (.xlsx ou .csv com colunas: codigo | nome | saldo)</span>
```
- Texto quebra em múltiplas linhas em mobile
- `text-sm` fica pequeno demais
- Sem espaço para ícone ou informação visual

**Impacto**: UI confusa, pouco profissional em mobile

**Solução**: Texto mais curto + tooltip/help
```tsx
<span className="text-sm">Carregar planilha</span>
<span className="text-xs opacity-75">Formato: .xlsx ou .csv</span>
```

---

### 4. **CountDetail cards layout ruim em mobile muito pequeno** ⚠️ MÉDIO
**Arquivo**: `src/pages/CountDetail.tsx` (linha ~429, 442)  
**Problema**:
```tsx
<div className="grid grid-cols-2 gap-3"> {...} </div>
<div className="grid grid-cols-3 gap-3"> {...} </div>
```
- 4 cards em 2 colunas = cada card fica estreito
- 3 cards em 1 linha = números "Regulares/Excesso/Falta" ficam apertados
- Em mobile < 375px fica ruim

**Impacto**: Cards parecem desorganizados, números podem ser cortados

**Solução**:
```tsx
// Grid cards: 1 coluna em mobile, 2 em tablet, 4 em desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

// Stats: 1 coluna em mobile, 3 em desktop
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
```

---

### 5. **Header mobile menu não tem ícone de hamburger visível** ⚠️ MÉDIO
**Arquivo**: `src/components/Header.tsx` (linha ~70-80)  
**Problema**:
- Menu mobile exists (`mobileMenuOpen` state) mas não há botão hamburger visível?
- Usuário mobile não consegue abrir menu
- Links desktop aparecem em mobile (hidden sm:flex) mas mobile precisa de menu alternativo

**Impacto**: Navegação inacessível em mobile

**Solução**: Implementar botão hamburger com ícone Menu/X

---

### 6. **Button "Reabrir contagem" quebra linha em mobile** ⚠️ MÉDIO
**Arquivo**: `src/pages/Report.tsx` (linha ~166)  
**Problema**:
```tsx
<div className="flex gap-2">
  <button className="btn" onClick={exportPDF}>Exportar PDF</button>
  <button className="btn btn-secondary" onClick={handleReopen}>Reabrir contagem</button>
</div>
```
- Dois botões lado a lado em flex
- Texto "Reabrir contagem" é longo
- Em telas < 400px ficam em 2 linhas, distorcendo layout

**Impacto**: Botões desalinhados, UX confusa

**Solução**:
```tsx
<div className="flex flex-col sm:flex-row gap-2">
  {/* botões empilhados em mobile, lado a lado em desktop */}
</div>
```

---

## 🟠 ERROS / PROBLEMAS (Devem ser melhorados)

### 7. **Font sizes não responsivos**
**Arquivos Afetados**: Múltiplos  
**Problema**:
- Muitos `text-sm` para labels que deveriam ser `text-xs` em mobile
- `text-xl` em headings pode ser muito grande em mobile
- Sem variação entre viewport mobile < 375px e >= 375px

**Impacto**: Texto pode ficar ilegível em mobile pequeno

**Sugestão**:
```css
/* Em styles.css ou tailwind.config.js */
@layer components {
  .text-input-mobile { @apply text-sm sm:text-base; }
  .text-label-mobile { @apply text-xs sm:text-sm; }
}
```

---

### 8. **Home.tsx sidebar quebra layout em mobile** ⚠️ MÉDIO
**Arquivo**: `src/pages/Home.tsx` (linha ~49)  
**Problema**:
```tsx
<div className="max-w-7xl mx-auto px-4 py-6 lg:pr-80">
```
- `max-w-7xl` = max-width muito grande (80rem = 1280px)
- `lg:pr-80` adiciona padding em desktop, mas em mobile poderia afetar layout
- Se sidebar está visible em mobile, pode cobrir conteúdo

**Impacto**: Conteúdo pode ser coberto pela sidebar em mobile

**Solução**: Garantir sidebar é hidden em mobile
```tsx
// No ContextualSidebar: class="hidden lg:block fixed right-0"
```

---

### 9. **Inputs não têm tamanho touch-friendly** ⚠️ MÉDIO
**Arquivos Afetados**: `ManualEntry.tsx`, `FileUpload.tsx`, `Login.tsx`  
**Problema**:
- Min-height de inputs não respeitam 44px (Apple HIG, Google Material Design)
- Inputs ficam muito pequenos para tocar com dedo em mobile

**Impacto**: Difícil interagir via touch, necessita zoom ou múltiplas tentativas

**Solução**:
```css
.input { @apply min-h-10 sm:min-h-9; } /* 40px em mobile, 36px em desktop */
.btn { @apply min-h-10 sm:min-h-9 px-4; } /* 40px em mobile */
```

---

### 10. **CoverageProgressBar não responsivo** ⚠️ BAIXO
**Arquivo**: `src/components/CoverageProgressBar.tsx` (linha ~167)  
**Problema**:
```tsx
<div className="grid grid-cols-2 gap-3">
```
- Números de progress em 2 colunas
- Labels podem não caber em mobile pequeno

**Impacto**: Layout apertado, pode quebrar em <375px

---

### 11. **Login form muito grande em mobile**
**Arquivo**: `src/pages/Login.tsx`  
**Problema**:
- Sem análise detalhada mas provavelmente tem classes sem breakpoint
- Inputs de email/senha podem ficar muito largos

**Impacto**: Formulário longo demais, necessário scroll desnecessário

---

### 12. **Toast notifications podem ficar atrás de buttons em mobile**
**Arquivos**: `src/components/Toast.tsx`  
**Problema**:
- Toast position: padrão é bottom
- Em mobile com teclado virtual ativo, toast pode desaparecer atrás do teclado

**Impacto**: Usuário nunca vê feedback de sucesso/erro

**Solução**: Detectar teclado virtual, posicionar toast acima ou com margin-bottom

---

### 13. **Counts.tsx - Botões de filtro muito comprimidos**
**Arquivo**: `src/pages/Counts.tsx`  
**Problema**:
```tsx
<div className="flex flex-wrap gap-2">
  <button className={...}>Todas</button> {/* OK */}
  <button className={...}>Em andamento</button> {/* Texto muito longo */}
  <button className={...}>Finalizadas</button> {/* Texto muito longo */}
  <button className={...}>Reavertidas</button> {/* Texto muito longo */}
</div>
```
- Botões com `flex-wrap` em mobile ficam em múltiplas linhas
- Texto longo demais para telas pequenas

**Impacto**: Filtros ocupam muito espaço vertical

**Solução**: Abreviar labels ou usar tabs em mobile
```tsx
{/* Mobile: abreviar */}
<span className="sm:hidden">And.</span>
<span className="hidden sm:inline">Em andamento</span>
```

---

### 14. **Counts.tsx - Nenhum scroll pull-to-refresh em mobile**
**Arquivo**: `src/pages/Counts.tsx`  
**Problema**:
- Botão "Carregar mais" é a única forma de scroll em mobile
- Native iOS/Android pull-to-refresh seria melhor UX
- Usuário precisa scroll até o final para carregar mais

**Impacto**: Menos intuitivo que aplicativos nativos

**Sugestão**: Implementar biblioteca como `react-pull-to-refresh`

---

## 🟡 MELHORIAS RECOMENDADAS (Nice to have)

### 15. **Adicionar Dark Mode detection para mobile**
**Impacto**: POSITIVO - Menos cansaço visual à noite

---

### 16. **Zoom de toque em inputs desabilitado**
```tsx
<input style={{ fontSize: '16px' }} /> {/* Previne iOS zoom ao focar */}
```

---

### 17. **Viewport meta tag pode estar faltando ou incorreta**
**Arquivo**: `index.html`  
**Verificar**:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

---

### 18. **Safe areas para notches and home indicators**
Para iPhone X e posterior:  
```css
padding-bottom: max(1rem, env(safe-area-inset-bottom));
```

---

### 19. **Cards em CountDetail poderiam ter swipe em mobile**
- Swipe esquerda para deletar manualmente
- Swipe direita para editar
- Mas isso requer biblioteca como `react-swipeable`

---

### 20. **Falta indicador visual de carregamento em mobile**
- Spinner no centro em vez de esqueleto completo pode ser melhor
- Esqueleto muito grande em mobile

---

## 📊 RESUMO DE SEVERIDADE

| Severidade | Quantidade | Status |
|-----------|-----------|--------|
| 🔴 CRÍTICO | 6 | Deve corrigir |
| 🟠 ALTO | 8 | Deve melhorar |
| 🟡 MÉDIO/BAIXO | 6+ | Nice to have |

---

## ✅ CHECKLIST DE CORREÇÃO

- [ ] Imediatamente - Corrigir tabelas Report.tsx (card layout + responsive)
- [ ] Imediatamente - Corrigir ManualEntry grid layout
- [ ] Hoje - Corrigir FileUpload label
- [ ] Hoje - Adicionar hamburger menu no Header
- [ ] Hoje - Corrigir botão "Reabrir contagem" wrapping
- [ ] Hoje - Implementar font sizes responsivos
- [ ] Amanhã - Corrigir touch-friendly input sizes
- [ ] Amanhã - Verificar viewport meta tags
- [ ] Esta semana - Implementar pull-to-refresh em Counts
- [ ] Esta semana - Revisar Home sidebar mobile
- [ ] Esta semana - Testar em diferentes dispositivos (iPhone SE, Pixel 4a, Galaxy S10)

---

## 🧪 TESTES RECOMENDADOS

```
Dispositivos:
- ✅ iPhone SE (375x667)
- ✅ iPhone 12 (390x844)
- ✅ Samsung Galaxy S10 (360x800)
- ✅ iPad (768x1024)

Navegadores:
- ✅ Safari iOS 14+
- ✅ Chrome Android
- ✅ Firefox Android
- ✅ Samsung Internet

Orientações:
- ✅ Portrait
- ✅ Landscape
```

---

## 📝 NOTAS

1. **Teclado virtual**: Em mobile Android, teclado ocupa ~50% da tela - verificar z-index dos elementos flutuantes
2. **Performance**: Lazy load componentes pesados como gráficos em mobile
3. **Banda**: Imagens sem otimização podem ser problema em 4G lento
4. **Touch targets**: Mínimo 44x44px (Apple) ou 48dp (Google Material Design)

---

**Próximas ações**:
1. Marcar sprints para corrigir items 1-6 (críticos)
2. Implementar testes visual em DevTools mobile simulator
3. Testar com usuários reais em mobile antes de lançar
