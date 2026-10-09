# 🔧 PLANO DE EXECUÇÃO - CORREÇÃO DOS 8 BUGS

## 📋 Resumo Executivo

- **Total de Bugs**: 8
- **Tempo Total**: ~2-2.5 horas
- **Complexidade**: Baixa a Média
- **Ordem de Execução**: Críticos primeiro, depois Médios

---

## 🔴 BUGS CRÍTICOS (3)

### BUG #1: React Hooks Anti-Pattern em Home.tsx
**Arquivo**: `src/pages/Home.tsx`  
**Severidade**: 🔴 CRITICAL  
**Tempo**: 30 minutos  
**Ordem**: 1º (bloqueia comportamento correto)

#### Problema Exato
```tsx
// ❌ ERRADO (linhas 68-111)
export default function Home() {
  // ... componente principal ...
  return (...)
}

// Função compõe depois do return (import errado)
function RecentCounts() {
  const [rows, setRows] = useState2(...)
  useEffect2(() => { ... }, [])
}
```

#### Solução
1. **Extrair RecentCounts para arquivo separado**
   - Criar: `src/components/RecentCounts.tsx`
   - Mover função inteira para lá
   - Importar em Home.tsx

#### Código Exato a Executar

**Passo 1**: Criar novo arquivo
```tsx
// src/components/RecentCounts.tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function RecentCounts() {
  const [rows, setRows] = useState<any[]>([])
  
  useEffect(() => {
    supabase
      .from('counts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRows(data || []))
  }, [])

  return (
    <div className="card">
      <div className="text-sm mb-3">Últimas contagens</div>
      <ul className="space-y-2">
        {rows.map(r => (
          <li key={r.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{r.nome}</div>
              <div className="text-xs text-zinc-500">
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
            <a 
              href={`/contagens/${r.id}`}
              className="badge"
            >
              Abrir
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

**Passo 2**: Atualizar Home.tsx

Remover a função RecentCounts do final e adicionar import no topo:

```tsx
// Adicionar no import
import { RecentCounts } from '@/components/RecentCounts'
```

#### Validação
```bash
# Não deve mais existir função fora do componente principal
# TypeScript: 0 errors
# React StrictMode: Sem warnings
```

---

### BUG #2: Charts.tsx - Dark Mode Ignorado
**Arquivo**: `src/components/Charts.tsx`  
**Severidade**: 🔴 CRITICAL  
**Tempo**: 45 minutos  
**Ordem**: 2º (visual crítico)

#### Problema Exato
```tsx
// ❌ Colors hardcoded (linhas 15-20)
<CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
<Tooltip 
  contentStyle={{
    backgroundColor: '#ffffff',  // ❌ Sempre branco
    border: '1px solid #e4e4e7',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
  }}
  labelStyle={{ color: '#18181b' }}  // ❌ Sempre preto
/>
<Bar dataKey="Regular" stackId="a" fill="#71717a" />
<Bar dataKey="Excesso" stackId="a" fill="#a1a1aa" />
<Bar dataKey="Falta" stackId="a" fill="#d4d4d8" />
```

#### Solução
Detectar tema escuro e ajustar cores dinamicamente

#### Código Exato a Executar

```tsx
// src/components/Charts.tsx (COMPLETO)
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Item = { name: string; Regular: number; Excesso: number; Falta: number }

export default function Charts({ data }: { data: Item[] }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Detectar dark mode
    const darkModeEnabled = document.documentElement.classList.contains('dark')
    setIsDark(darkModeEnabled)

    // Listen para mudanças de tema
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark')
      setIsDark(dark)
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  // Cores dinâmicas baseadas no tema
  const colors = {
    gridStroke: isDark ? '#27272a' : '#e4e4e7',
    tooltipBg: isDark ? '#18181b' : '#ffffff',
    tooltipBorder: isDark ? '#3f3f46' : '#e4e4e7',
    tooltipText: isDark ? '#fafafa' : '#18181b',
    axisLabel: isDark ? '#a1a1aa' : '#71717a',
    barRegular: isDark ? '#a1a1aa' : '#71717a',
    barExcesso: isDark ? '#71717a' : '#a1a1aa',
    barFalta: isDark ? '#52525b' : '#d4d4d8'
  }

  return (
    <div className="card mt-4">
      <div className="text-sm mb-2">Resumo por Contagem</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={colors.gridStroke} 
            />
            <XAxis 
              dataKey="name"
              stroke={colors.axisLabel}
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              allowDecimals={false}
              stroke={colors.axisLabel}
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              labelStyle={{ color: colors.tooltipText }}
              itemStyle={{ color: colors.tooltipText }}
            />
            <Bar dataKey="Regular" stackId="a" fill={colors.barRegular} />
            <Bar dataKey="Excesso" stackId="a" fill={colors.barExcesso} />
            <Bar dataKey="Falta" stackId="a" fill={colors.barFalta} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

#### Validação
```bash
# Light mode: Barras visíveis, cores corretas
# Dark mode: Barras visíveis, cores invertidas
# Toggle tema: Cores mudam em tempo real ✅
```

---

### BUG #3: Toast Container Sem Posicionamento Fixo
**Arquivo**: `src/components/Toast.tsx`  
**Severidade**: 🔴 CRITICAL  
**Tempo**: 20 minutos  
**Ordem**: 3º (impacta UX)

#### Problema Exato
```tsx
// ❌ Linhas 138-145
function ToastContainer({ toasts, onRemove }: ...) {
  return (
    <div className="flex flex-col gap-1">  // ❌ Sem fixed position!
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}
```

#### Solução
Adicionar posicionamento fixo ao container

#### Código Exato a Executar

```tsx
// src/components/Toast.tsx (linha da função ToastContainer)
// Localizar função ToastContainer e substituir apenas a div:

// ❌ ANTES
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-1">

// ✅ DEPOIS
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-1 pointer-events-auto w-full max-w-sm px-4">
```

#### Validação
```bash
# Toast aparece sempre no canto inferior direito
# Não é coberto por outros elementos
# Clicável mesmo com outros modais abertos
```

---

## 🟡 BUGS MÉDIOS (4)

### BUG #4: CountDetail.tsx - Falta Validação user_id
**Arquivo**: `src/pages/CountDetail.tsx`  
**Severidade**: 🟡 MEDIUM  
**Tempo**: 30 minutos  
**Ordem**: 4º (segurança)

#### Problema Exato
Linha ~135-138:
```tsx
// ❌ Sem filtragem user_id
await supabase.from('plan_items').delete().eq('count_id', id)
```

#### Solução
Adicionar validação que encontra count_id do usuário antes de deletar

#### Código Exato a Executar
Localizar a função `onParsed` e substituir o delete:

```tsx
// ❌ ANTES (linha ~136)
await supabase.from('plan_items').delete().eq('count_id', id)

// ✅ DEPOIS
// Validar que count pertence ao usuário
const { data: countData, error: countError } = await supabase
  .from('counts')
  .select('id')
  .eq('id', id)
  .eq('user_id', (await supabase.auth.getSession()).data.session?.user.id)
  .single()

if (countError || !countData) {
  throw new Error('Não autorizado')
}

// Agora sim delete
await supabase.from('plan_items').delete().eq('count_id', id)
```

---

### BUG #5: Login.tsx - Password Strength Sem Feedback Visual
**Arquivo**: `src/pages/Login.tsx`  
**Severidade**: 🟡 MEDIUM  
**Tempo**: 45 minutos  
**Ordem**: 5º (UX crítico)

#### Problema Exato
Linhas ~25-30: Valida mas nunca mostra feedback

#### Solução
Criar componente `<PasswordStrengthMeter />` e mostrar durante signup

#### Código Exato a Executar

**Passo 1**: Criar novo componente
```tsx
// src/components/PasswordStrengthMeter.tsx
interface PasswordStrengthMeterProps {
  password: string
  strength?: { valid: boolean; errors: string[] }
}

export function PasswordStrengthMeter({ password, strength }: PasswordStrengthMeterProps) {
  if (!password) return null

  const getStrengthLevel = () => {
    if (!password) return 0
    if (password.length < 8) return 1
    if (!strength?.valid) return 2
    return 3
  }

  const level = getStrengthLevel()
  const labels = ['Muito fraca', 'Fraca', 'Média', 'Forte']
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']

  return (
    <div className="mt-3 space-y-2">
      {/* Barra de força */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Força da senha: <span className={colors[level]}>{labels[level]}</span>
        </div>
        <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors[level]} transition-all duration-300`}
            style={{ width: `${((level + 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Requisitos */}
      {level < 3 && strength?.errors && (
        <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
          {strength.errors.map((error, i) => (
            <li key={i}>❌ {error}</li>
          ))}
        </ul>
      )}

      {/* Sucesso */}
      {level === 3 && (
        <p className="text-xs text-green-600 dark:text-green-400">
          ✅ Senha segura!
        </p>
      )}
    </div>
  )
}
```

**Passo 2**: Usar em Login.tsx

Adicionar import:
```tsx
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter'
```

Localizar input de senha e adicionar depois dele:
```tsx
// ❌ ANTES (após password input)
{/* sem feedback */}

// ✅ DEPOIS
{mode === 'signup' && (
  <PasswordStrengthMeter 
    password={password}
    strength={passwordStrength}
  />
)}
```

---

### BUG #6: Counts.tsx - Sem Loading State Visual
**Arquivo**: `src/pages/Counts.tsx`  
**Severidade**: 🟡 MEDIUM  
**Tempo**: 30 minutos  
**Ordem**: 6º (UX)

#### Problema Exato
Linha ~29-31: Apenas texto genérico

```tsx
// ❌ ANTES
{loading ? (
  <div className="text-sm text-zinc-500">Carregando…</div>
) : (
  // shows list
)}
```

#### Solução
Mostrar skeleton loaders em lugar da lista

#### Código Exato a Executar

**Passo 1**: Criar Skeleton Loader component
```tsx
// src/components/SkeletonLoader.tsx
export function SkeletonLoader() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="card flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 animate-pulse" />
            <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2 animate-pulse" />
          </div>
          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-16 animate-pulse" />
        </div>
      ))}
    </div>
  )
}
```

**Passo 2**: Usar em Counts.tsx

Adicionar import:
```tsx
import { SkeletonLoader } from '@/components/SkeletonLoader'
```

Substituir:
```tsx
// ❌ ANTES
{loading ? (
  <div className="text-sm text-zinc-500">Carregando…</div>
) : (
  <ul className="space-y-2">
    {/* items */}
  </ul>
)}

// ✅ DEPOIS
{loading ? (
  <SkeletonLoader />
) : (
  <ul className="space-y-2">
    {/* items */}
  </ul>
)}
```

---

### BUG #7: LandingPage.tsx - Tipografia Não Responsiva
**Arquivo**: `src/pages/LandingPage.tsx`  
**Severidade**: 🟡 MEDIUM  
**Tempo**: 25 minutos  
**Ordem**: 7º (mobile experience)

#### Problema Exato
Linhas ~80-100: `text-5xl` em hero section não é responsivo

```tsx
// ❌ ANTES
<h1 className="text-5xl font-bold">
  Seu Sistema de Auditoria de Estoque
</h1>
```

#### Solução
Usar responsive text sizes com Tailwind breakpoints

#### Código Exato a Executar
Localizar hero section e substituir:

```tsx
// ❌ ANTES
<h1 className="text-5xl font-bold">
  Seu Sistema de Auditoria de Estoque
</h1>

// ✅ DEPOIS
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
  Seu Sistema de Auditoria de Estoque
</h1>

// E fazer o mesmo para h2
// ❌ ANTES
<p className="text-2xl text-gray-600 mt-4">

// ✅ DEPOIS
<p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 mt-4">
```

Buscar por todos os `text-5xl`, `text-4xl`, `text-3xl` no arquivo e adicionar breakpoints.

---

### BUG #8: Inconsistência de Rounded Corners
**Arquivo**: `src/styles.css`  
**Severidade**: 🟢 LOW  
**Tempo**: 15 minutos  
**Ordem**: 8º (polish)

#### Problema Exato
Projeto usa: `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full`

#### Solução
Criar design token para rounded corners

#### Código Exato a Executar

Adicionar ao `src/styles.css`:

```css
/* Design Tokens - Rounded Corners */
:root {
  --radius-sm: 0.375rem;   /* rounded-sm */
  --radius-base: 0.5rem;   /* rounded-md */
  --radius-lg: 0.75rem;    /* rounded-lg */
  --radius-xl: 1rem;       /* rounded-xl / PADRÃO untuk componentes */
  --radius-2xl: 1.5rem;    /* rounded-2xl / PADRÃO untuk cards */
  --radius-full: 9999px;   /* rounded-full */
}

/* Aplicar padrão aos componentes existentes */
.card {
  border-radius: var(--radius-2xl);
}

.btn {
  border-radius: var(--radius-xl);
}

.input {
  border-radius: var(--radius-xl);
}

.badge {
  border-radius: var(--radius-full);
}
```

E em componentes, padronizar para `rounded-xl` (cards) e `rounded-2xl` (big cards).

---

## 📊 SUMÁRIO DA EXECUÇÃO

| # | Bug | Arquivo | Time | Status |
|---|-----|---------|------|--------|
| 1 | React Hooks | Home.tsx + new | 30m | 🔴 |
| 2 | Dark mode Charts | Charts.tsx | 45m | 🔴 |
| 3 | Toast position | Toast.tsx | 20m | 🔴 |
| 4 | User validation | CountDetail.tsx | 30m | 🟡 |
| 5 | Password strength | Login.tsx + new | 45m | 🟡 |
| 6 | Loading state | Counts.tsx + new | 30m | 🟡 |
| 7 | Mobile typography | LandingPage.tsx | 25m | 🟡 |
| 8 | Rounded corners | styles.css | 15m | 🟢 |
| | **TOTAL** | | **2h 20m** | |

---

## ✅ CHECKLIST DE VALIDAÇÃO PÓS-EXECUÇÃO

- [ ] TypeScript compilation: Zero errors
- [ ] React console: Zero warnings
- [ ] Bug #1: RecentCounts sem workaround useState2
- [ ] Bug #2: Charts mudança cor ao alternar tema
- [ ] Bug #3: Toast sempre visível no canto inferior direito
- [ ] Bug #4: Delete valida user_id antes de RemoteHostManager
- [ ] Bug #5: Password strength mostra barra de força
- [ ] Bug #6: Skeleton loaders aparecem enquanto carrega
- [ ] Bug #7: Tipografia responsive em mobile
- [ ] Bug #8: Rounded corners consistente (xl/2xl)

---

## 🚀 ORDEM RECOMENDADA DE EXECUÇÃO

**Sessão 1** (Bugs críticos - 2h):
1. React Hooks (Home.tsx) - 30m
2. Dark mode Charts - 45m
3. Toast position - 20m
4. User validation - 30m

**Sessão 2** (Bugs médios - 1h 45m):
5. Password strength - 45m
6. Loading state - 30m
7. Mobile typography - 25m
8. Rounded corners - 15m

---

**Tempo Total: 2h 20m para todos os 8 bugs**
