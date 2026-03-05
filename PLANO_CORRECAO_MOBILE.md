# 📱 PLANO DE CORREÇÃO MOBILE - Audite.AI

**Data de Início**: 05 de Março de 2026  
**Objetivo**: Tornar Audite.AI totalmente responsivo e mobile-first  
**Estimativa Total**: ~4-5 horas  

---

## 🎯 VISÃO GERAL

```
FASE 1: Correções Críticas (1.5h)
  ├─ ManualEntry - Grid responsivo
  ├─ FileUpload - Label simplificado
  ├─ Report.tsx - Tabelas mobile
  └─ CountDetail.tsx - Cards layout

FASE 2: Navegação & UX (1h)
  ├─ Header - Hamburger menu
  ├─ Counts.tsx - Botões filtro
  └─ Buttons - Wrapping correto

FASE 3: Responsividade Geral (1.5h)
  ├─ Font sizes
  ├─ Input sizes touch-friendly
  ├─ Viewport meta tags
  └─ Safe areas

FASE 4: Testes & Validação (0.5h)
  ├─ Mobile simulator DevTools
  ├─ Diferentes resoluções
  └─ Orientações portrait/landscape
```

---

# 📋 PLANO DETALHADO

## ⏱️ FASE 1: CORREÇÕES CRÍTICAS (1h 30min)

### ✅ TAREFA 1.1: ManualEntry - Grid Responsivo
**Arquivo**: `src/components/ManualEntry.tsx`  
**Tempo**: 5 min  
**Prioridade**: 🔴 CRÍTICA

**O que fazer**:
```tsx
// ANTES:
<form onSubmit={submit} className="grid grid-cols-3 gap-2 items-center">

// DEPOIS:
<form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 items-center">
  <input className="input col-span-1" ... /> {/* 1 coluna inteira em mobile */}
  <input className="input col-span-1 sm:col-span-1" ... /> {/* 1 coluna em mobile, 1 em tablet */}
  <button className="btn col-span-1 sm:col-span-2 lg:col-span-3" type="submit">Adicionar</button>
</form>
```

**Por quê**: Inputs muito estreitos em mobile - impossível digitar

**Resultado esperado**: 
- ✅ Mobile: 1 input por linha, botão em larura cheia
- ✅ Tablet: 2 inputs lado a lado
- ✅ Desktop: 3 colunas originais

---

### ✅ TAREFA 1.2: FileUpload - Label Simplificado
**Arquivo**: `src/components/FileUpload.tsx`  
**Tempo**: 5 min  
**Prioridade**: 🔴 CRÍTICA

**O que fazer**:
```tsx
// ANTES:
<span className="text-sm">Planilha (.xlsx ou .csv com colunas: codigo | nome | saldo)</span>

// DEPOIS:
<div className="space-y-1">
  <span className="text-sm font-medium">Carregar planilha</span>
  <span className="text-xs text-zinc-500 block">Formato: .xlsx ou .csv (código | nome | saldo)</span>
</div>
```

**Por quê**: Label muito longo quebra em múltiplas linhas em mobile

**Resultado esperado**:
- ✅ Título curto e claro
- ✅ Formato em linha secundária mais discreta
- ✅ Fácil de ler em mobile

---

### ✅ TAREFA 1.3: Report.tsx - Tabelas Responsivas
**Arquivo**: `src/pages/Report.tsx`  
**Tempo**: 20 min  
**Prioridade**: 🔴 CRÍTICA

**O que fazer**:

Substituir tabelas por card layout em mobile (< sm):

```tsx
// Adicionar função helper no topo do component:
function isSmallScreen(): boolean {
  return window.innerWidth < 640; // Tailwind sm breakpoint
}

// Na função SimpleTable, adicionar renderização condicional:
return (
  <>
    {/* Desktop: Tabela */}
    <div className="hidden sm:block overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        {/* ... tabela existente ... */}
      </table>
    </div>

    {/* Mobile: Cards */}
    <div className="sm:hidden space-y-2">
      {rows.map((r, i) => {
        const diff = (r.manual_qtd || 0) - (r.saldo_qtd || 0)
        let bgColor = 'bg-white dark:bg-zinc-900'
        
        if (r.status === 'regular') {
          bgColor = 'bg-green-50 dark:bg-green-950/20'
        } else if (r.status === 'falta') {
          bgColor = 'bg-red-50 dark:bg-red-950/20'
        } else if (r.status === 'excesso') {
          bgColor = 'bg-blue-50 dark:bg-blue-950/20'
        }
        
        return (
          <div key={i} className={`${bgColor} p-4 rounded-lg border border-zinc-200 dark:border-zinc-800`}>
            <div className="font-mono font-semibold text-zinc-900 dark:text-white mb-2">
              {r.codigo}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              {r.nome_produto || '—'}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Esperado</div>
                <div className="font-semibold text-zinc-900 dark:text-white">{r.saldo_qtd}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Encontrado</div>
                <div className="font-semibold text-zinc-900 dark:text-white">{r.manual_qtd}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Diferença</div>
                <div className={`font-bold ${getDifferenceClass(diff)}`}>
                  {diff > 0 ? '+' : ''}{diff}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  </>
)
```

**Por quê**: Tabelas ilegíveis em mobile < 375px

**Resultado esperado**:
- ✅ Desktop: Tabela normal
- ✅ Mobile: Card layout legível
- ✅ Toque fácil em mobile

---

### ✅ TAREFA 1.4: CountDetail.tsx - Cards Layout Responsivo
**Arquivo**: `src/pages/CountDetail.tsx`  
**Tempo**: 10 min  
**Prioridade**: 🔴 CRÍTICA

**O que fazer**:
```tsx
// LINHA ~429: Resumo de quantidades
// ANTES:
<div className="grid grid-cols-2 gap-3">

// DEPOIS:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

// LINHA ~442: Stats (Reg/Exc/Fal)
// ANTES:
<div className="grid grid-cols-3 gap-3">

// DEPOIS:
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
```

**Por quê**: Cards muito apertados em mobile, números ficam comprimidos

**Resultado esperado**:
- ✅ Mobile: 1 card por linha
- ✅ Tablet: 2 cards por linha
- ✅ Desktop: 4 cards por linha
- ✅ Stats sempre em 3 colunas (ou 1 em mobile muito pequeno)

---

## ⏱️ FASE 2: NAVEGAÇÃO & UX (1h)

### ✅ TAREFA 2.1: Header - Hamburger Menu Mobile
**Arquivo**: `src/components/Header.tsx`  
**Tempo**: 25 min  
**Prioridade**: 🔴 CRÍTICA

**O que fazer**:

1. Adicionar import do ícone Menu:
```tsx
import { Settings, Menu, X } from 'lucide-react'
```

2. Adicionar botão hamburger (linha ~76, antes do Logo):
```tsx
<button
  className="sm:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
  aria-label="Menu"
>
  {mobileMenuOpen ? (
    <X className="w-6 h-6" />
  ) : (
    <Menu className="w-6 h-6" />
  )}
</button>
```

3. Modificar navegação desktop (linha ~80):
```tsx
{/* Desktop Navigation - only show when authenticated and not on login */}
{authed && loc.pathname !== '/login' && (
  <nav className="navigation-menu hidden sm:flex items-center gap-4">
    {/* ... links existentes ... */}
  </nav>
)}
```

4. Adicionar menu mobile dropdown (após navigation-menu desktop, linha ~100):
```tsx
{/* Mobile Menu - Dropdown */}
{mobileMenuOpen && authed && loc.pathname !== '/login' && (
  <div className="sm:hidden absolute top-14 left-0 right-0 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900">
    <nav className="px-4 py-3 space-y-2">
      <Link 
        to="/dashboard" 
        className="block px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded"
        onClick={handleMobileNavClick}
      >
        Dashboard
      </Link>
      <Link 
        to="/contagens" 
        className="block px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded"
        onClick={handleMobileNavClick}
      >
        Contagens
      </Link>
      <Link 
        to="/calendario" 
        className="block px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded"
        onClick={handleMobileNavClick}
      >
        Calendário
      </Link>
      {isAdmin && (
        <Link 
          to="/admin" 
          className="block px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded"
          onClick={handleMobileNavClick}
        >
          Admin
        </Link>
      )}
      <button
        onClick={() => { logout(); handleMobileNavClick() }}
        className="block w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
      >
        Sair
      </button>
    </nav>
  </div>
)}
```

**Por quê**: Sem hamburger menu, não consegue navegar em mobile

**Resultado esperado**:
- ✅ Ícone Menu visível em mobile
- ✅ Click abre/fecha menu dropdown
- ✅ Menu fecha ao clicar em link
- ✅ Desktop sem mudanças

---

### ✅ TAREFA 2.2: Report.tsx - Botões em Flex Responsivo
**Arquivo**: `src/pages/Report.tsx`  
**Tempo**: 5 min  
**Prioridade**: 🔴 CRÍTICA

**O que fazer**:
```tsx
// ANTES:
<div className="flex gap-2">
  <button className="btn" onClick={exportPDF}>Exportar PDF</button>
  <button className="btn btn-secondary" onClick={handleReopen} disabled={reopening}>
    {reopening ? 'Reabrindo…' : 'Reabrir contagem'}
  </button>
</div>

// DEPOIS:
<div className="flex flex-col sm:flex-row gap-2">
  <button className="btn flex-1 sm:flex-none" onClick={exportPDF}>Exportar PDF</button>
  <button className="btn btn-secondary flex-1 sm:flex-none" onClick={handleReopen} disabled={reopening}>
    {reopening ? 'Reabrindo…' : 'Reabrir'}
  </button>
</div>
```

**Nota**: "Reabrir" em vez de "Reabrir contagem" em mobile para economizar espaço

**Por quê**: Botões quebram em 2 linhas em mobile pequeno

**Resultado esperado**:
- ✅ Mobile: Botões empilhados verticalmente, largura cheia
- ✅ Desktop: Botões lado a lado
- ✅ Texto mais curto em mobile

---

### ✅ TAREFA 2.3: Counts.tsx - Botões Filtro Responsivos
**Arquivo**: `src/pages/Counts.tsx`  
**Tempo**: 10 min  
**Prioridade**: 🟠 ALTA

**O que fazer**:

Opção A (Recomendada): Abreviar labels em mobile
```tsx
const filterLabels = {
  todas: { short: 'Todas', long: 'Todas' },
  em_andamento: { short: 'And.', long: 'Em andamento' },
  finalizada: { short: 'Final.', long: 'Finalizadas' },
  reavertida: { short: 'Reabert.', long: 'Reavertidas' }
}

<div className="flex flex-wrap gap-2">
  <button>
    <span className="sm:hidden">{filterLabels[status].short}</span>
    <span className="hidden sm:inline">{filterLabels[status].long}</span>
  </button>
</div>
```

Opção B (Alternativa): Usar tabs scrolláveis
```tsx
<div className="overflow-x-auto pb-2">
  <div className="flex gap-2 min-w-min">
    {/* botões */}
  </div>
</div>
```

**Por quê**: Botões com textos longos quebram layout em mobile pequeno

**Resultado esperado**:
- ✅ Mobile: Labels abreviados ("And." em vez de "Em andamento")
- ✅ Desktop: Labels completos
- ✅ Todos os filtros visíveis, sem scroll

---

## ⏱️ FASE 3: RESPONSIVIDADE GERAL (1h 30min)

### ✅ TAREFA 3.1: Font Sizes Responsivos
**Arquivo**: `src/styles.css`  
**Tempo**: 15 min  
**Prioridade**: 🟠 ALTA

**O que fazer**:

Adicionar ao final de `src/styles.css`:

```css
/* Mobile-first font sizing */
@layer components {
  /* Texto de input responsivo (previne zoom em iOS) */
  .input {
    @apply min-h-10 text-base sm:text-sm sm:min-h-9;
  }

  /* Botão responsivo - 44px em mobile (Apple guideline) */
  .btn {
    @apply min-h-10 sm:min-h-9 text-sm sm:text-xs font-medium;
  }

  /* Label responsivo */
  .label-text {
    @apply text-sm sm:text-xs;
  }

  /* Small text responsivo */
  .text-help {
    @apply text-xs sm:text-xs text-zinc-500 dark:text-zinc-400;
  }

  /* Heading responsivo */
  .heading-mobile {
    @apply text-lg sm:text-xl;
  }
}

/* Previne zoom ao focar em inputs em iOS */
input[type="text"],
input[type="email"],
input[type="password"],
input[type="number"],
textarea,
select {
  font-size: 16px;
}

@media (min-width: 640px) {
  input[type="text"],
  input[type="email"],
  input[type="password"],
  input[type="number"],
  textarea,
  select {
    font-size: 14px;
  }
}
```

**Por quê**: Melhor legibilidade em mobile, preventing zoom iOS

**Resultado esperado**:
- ✅ Inputs: 16px em mobile (sem zoom), 14px em desktop
- ✅ Botões: 40px altura em mobile, 36px em desktop
- ✅ Texto: Proporcional em todas resoluções

---

### ✅ TAREFA 3.2: Viewport Meta Tag
**Arquivo**: `index.html`  
**Tempo**: 5 min  
**Prioridade**: 🟠 ALTA

**O que fazer**:

Verificar e atualizar em `index.html` (na seção `<head>`):

```html
<!-- ANTES: (se existir) -->
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- DEPOIS: -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
```

ou se já existir completa:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
```

**Por quê**: Garante escala correta em mobile, suporta notches (iPhone X+)

**Resultado esperado**:
- ✅ Sem zoom automático em iOS
- ✅ App preenche notch
- ✅ Sem scroll horizontal desnecessário

---

### ✅ TAREFA 3.3: Safe Areas para Notch/Home Indicator
**Arquivo**: `src/components/Header.tsx` e `src/App.tsx`  
**Tempo**: 10 min  
**Prioridade**: 🟡 MÉDIA

**O que fazer**:

Em `src/components/Header.tsx`, adicionar padding para notch:

```tsx
<header className="sticky top-0 z-50 bg-white/75 dark:bg-zinc-950/75 backdrop-blur border-b border-zinc-100 dark:border-zinc-900"
  style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
>
```

Em `src/App.tsx`, adicionar padding para home indicator:

```tsx
<main 
  className={...}
  style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
>
```

**Por quê**: iPhone X+ e Android phones com gestures precisam de espaço

**Resultado esperado**:
- ✅ Header não é coberto por notch
- ✅ Conteúdo não é coberto por home indicator
- ✅ App mais nativo-looking

---

### ✅ TAREFA 3.4: Login Form Responsivo
**Arquivo**: `src/pages/Login.tsx`  
**Tempo**: 10 min  
**Prioridade**: 🟡 MÉDIA

**O que fazer**:

Verificar que o form está dentro de container responsivo (provavelmente já está):

```tsx
<div className="max-w-md mx-auto px-4">
  {/* form */}
</div>
```

Se form tiver inputs sem responsive sizing, adicionar:

```tsx
<input className="input text-base sm:text-sm" ... />
```

**Por quê**: Garantir legibilidade no form de login

**Resultado esperado**:
- ✅ Form não ultrapassar 100% da largura
- ✅ Inputs com tamanho touch-friendly

---

### ✅ TAREFA 3.5: CoverageProgressBar Responsivo
**Arquivo**: `src/components/CoverageProgressBar.tsx`  
**Tempo**: 5 min  
**Prioridade**: 🟡 MÉDIA

**O que fazer**:

Procurar por grid ou flex com tamanho fixo:

```tsx
// Se encontrar:
<div className="grid grid-cols-2 gap-3">

// Mudar para:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

**Resultado esperado**:
- ✅ Itens em 1 coluna em mobile
- ✅ 2 colunas em desktop

---

### ✅ TAREFA 3.6: Toast Notifications Responsivo
**Arquivo**: `src/components/Toast.tsx`  
**Tempo**: 15 min  
**Prioridade**: 🟡 MÉDIA

**O que fazer**:

Se Toast ficar no bottom, adicionar margin quando teclado virtual estiver ativo:

```tsx
// Detectar teclado virtual em Android/iOS
const [keyboardVisible, setKeyboardVisible] = useState(false)

useEffect(() => {
  const handleResize = () => {
    const newHeight = window.innerHeight
    const screenHeight = window.screen.height
    setKeyboardVisible(newHeight < screenHeight * 0.75)
  }
  
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])

// No container Toast:
<div 
  className="fixed bottom-4 right-4 z-50"
  style={{ marginBottom: keyboardVisible ? '300px' : '0' }}
>
```

**Por quê**: Toast não desaparece atrás do teclado

---

## ⏱️ FASE 4: TESTES & VALIDAÇÃO (30min)

### ✅ TAREFA 4.1: Teste Mobile Simulator
**Tempo**: 10 min  
**Prioridade**: 🔴 CRÍTICA

**Como fazer**:

1. Abrir DevTools (F12)
2. Clicar em "Toggle Device Toolbar" (Ctrl+Shift+M)
3. Testar em diferentes resoluções:
   - [ ] iPhone SE (375x667)
   - [ ] iPhone 12 (390x844)
   - [ ] Samsung Galaxy S10 (360x800)
   - [ ] iPad (768x1024)

**Checklist**:
- [ ] ManualEntry inputs estão usáveis
- [ ] FileUpload label cabe na tela
- [ ] Report tabelas são legíveis (cards em mobile)
- [ ] CountDetail cards têm espaço
- [ ] Header tem hamburger menu
- [ ] Buttons não quebram
- [ ] Counts filtros coubem
- [ ] Nenhum scroll horizontal desnecessário
- [ ] Toast não fica atrás do teclado
- [ ] Font sizes legíveis

---

### ✅ TAREFA 4.2: Teste Orientação
**Tempo**: 5 min  
**Prioridade**: 🟡 MÉDIA

**Como fazer**:

No Device Toolbar:
1. Mudar para Landscape
2. Testar mesmas páginas

**Checklist**:
- [ ] Layout se adapta bem
- [ ] Não há scroll horizontal
- [ ] Elementos não se sobrepõem

---

### ✅ TAREFA 4.3: Teste Dark Mode
**Tempo**: 5 min  
**Prioridade**: 🟡 MÉDIA

**Como fazer**:

No DevTools:
1. F12 > Rendering > Emulate CSS media feature prefers-color-scheme
2. Trocar entre light/dark

**Checklist**:
- [ ] Cores contrastam bem
- [ ] Texto legível em dark mode
- [ ] Sem cores muito pálidas

---

### ✅ TAREFA 4.4: Teste Real Device (Opcional)
**Tempo**: 5 min  
**Prioridade**: 🟡 MÉDIO

**Como fazer**:

Se tiver smartphone:
1. Conectar ao mesmo WiFi
2. Acessar http://[seu-ip-local]:5177
3. Testar navegação real

**Resultado esperado**:
- ✅ Touch funciona bem
- ✅ Sem lag ou freeze
- ✅ Teclado não causa problemas

---

## 📊 ORDEM DE EXECUÇÃO RECOMENDADA

```
Manhã (2h):
 1. Tarefa 1.1 - ManualEntry (5 min)
 2. Tarefa 1.2 - FileUpload (5 min)
 3. Tarefa 1.3 - Report tabelas (20 min)
 4. Tarefa 1.4 - CountDetail grids (10 min)
 5. Testar no simulator (10 min) ⭐ IMPORTANTE

Meio da manhã (1.5h):
 6. Tarefa 2.1 - Header menu (25 min)
 7. Tarefa 2.2 - Report botões (5 min)
 8. Tarefa 2.3 - Counts filtros (10 min)
 9. Testar novamente (10 min) ⭐ IMPORTANTE

Tarde (1.5h):
10. Tarefa 3.1 - Font sizes (15 min)
11. Tarefa 3.2 - Viewport meta (5 min)
12. Tarefa 3.3 - Safe areas (10 min)
13. Tarefa 3.4 - Login form (10 min)
14. Tarefa 3.5 - CoverageProgressBar (5 min)
15. Tarefa 3.6 - Toast (15 min)

Final (30min):
16. Tarefa 4.1 - Teste mobile (10 min)
17. Tarefa 4.2 - Teste landscape (5 min)
18. Tarefa 4.3 - Teste dark mode (5 min)
19. Tarefa 4.4 - Teste real device (5 min, optional)
```

**Tempo Total**: ~4 horas 30 minutos

---

## ✅ CHECKLIST PRÉ-IMPLEMENTAÇÃO

- [ ] Backup do projeto feito (git commit)
- [ ] Branch criado: `feature/mobile-responsive`
- [ ] Todas as 19 tarefas revisadas
- [ ] DevTools pronto para testes
- [ ] Smartphone (se disponível) para teste real

---

## 📝 NOTAS IMPORTANTES

1. **Testar após cada fase** - Não deixar para testar tudo no final
2. **Usar Git commits frequentes** - Facilita rollback se algo quebrar
3. **Validação W3C** - Depois, validar HTML em https://validator.w3.org/
4. **Lighthouse Mobile** - DevTools > Lighthouse, rodar audit mobile
5. **Scrolling suave** - Adicionar `scroll-behavior: smooth;` em CSS se não tiver

---

## 🚀 PRÓXIMOS PASSOS APÓS IMPLEMENTAÇÃO

1. Testar em dispositivos reais (iOS + Android)
2. Publicar em produção
3. Monitorar feedback de usuários mobile
4. Otimizar imagens para mobile (se houver)
5. Implementar PWA (Progressive Web App) para instalação

---

## 📞 SUPORTE DURANTE IMPLEMENTAÇÃO

Se encontrar problemas:
1. Verificar se Tailwind foi recompilado (`npm run build`)
2. Limpar cache do navegador (Ctrl+Shift+Delete)
3. Reiniciar dev server (`npm run dev`)
4. Verificar DevTools console para mensagens de erro

---

**Status**: 🟢 PRONTO PARA COMEÇAR

Quer que eu comece pela Fase 1 agora?
