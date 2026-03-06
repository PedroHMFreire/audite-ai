# 🔔 Sistema de Notificações de Auditorias - Guia de Implementação

## Visão Geral

Sistema completo de notificações para avisar usuários sobre datas e horários de auditorias agendadas. Suporta múltiplos canais: In-App, Push Notifications, E-mail.

## ✅ Checklist de Implementação

### 1. **Banco de Dados (Supabase)**

#### Executar Migration SQL
```sql
-- Execute o arquivo: supabase/migrations/20260306_notifications_system.sql

-- Cria as tabelas:
-- - notifications_preferences (preferências do usuário)
-- - notifications_log (log de notificações enviadas)

-- Com índices, triggers, RLS policies e funções utilitárias
```

**Status**: ✅ Arquivo criado em `supabase/migrations/20260306_notifications_system.sql`

---

### 2. **Backend - Serviços**

#### Arquivo: `src/lib/scheduleNotifications.ts`

Este é o coração do sistema com as seguintes funções:

- **`checkScheduledAuditsForNotification()`** - Verifica auditorias que precisam notificação
- **`getUserNotificationPreferences()`** - Obter preferências do usuário
- **`shouldSendNotification()`** - Validar se deve enviar baseado em regras
- **`sendNotification()`** - Enviar notificação em múltiplos canais
- **`markNotificationAsRead()`** - Marcar como lida
- **`getUnreadNotifications()`** - Listar não lidas
- **`getUnreadNotificationsCount()`** - Contar não lidas
- **`updateNotificationPreferences()`** - Atualizar preferências

**Status**: ✅ Arquivo criado

---

### 3. **Frontend - Componentes React**

#### `src/components/NotificationCenter.tsx`

Componente que exibe:
- ✅ Bell icon com badge de contagem de não lidas
- ✅ Dropdown com lista de notificações
- ✅ Ícones por tipo de notificação
- ✅ Tempo relativo formatado
- ✅ Opção "marcar tudo como lido"
- ✅ Link para página de notificações

**Uso no Header:**

```tsx
import NotificationCenter from './components/NotificationCenter'
import { useNotifications } from './hooks/useNotifications'

function Header() {
  const { user } = useAuth()
  const { preferences } = useNotifications(user?.id)

  return (
    <header>
      {/* ... outros elementos ... */}
      <NotificationCenter preferences={preferences} />
    </header>
  )
}
```

**Status**: ✅ Arquivo criado

#### `src/pages/NotificationPreferences.tsx`

Página completa para usuário configurar:
- ✅ Ativar/desativar notificações globalmente
- ✅ Escolher canais (In-App, Push, Email)
- ✅ Escolher timing (7 dias, 1 dia, 1 hora, agora)
- ✅ Configurar horários silenciosos
- ✅ Escolher fuso horário
- ✅ Salvar preferências

**Rota recomendada:**

```tsx
// Em App.tsx ou Router
<Route path="/settings/notifications" element={<NotificationPreferences />} />
```

**Status**: ✅ Arquivo criado

---

### 4. **Service Worker - Push Notifications**

#### Arquivo: `public/service-worker.js`

Adicionado handlers para:
- ✅ `notificationclick` - Abrir auditoria ao clicar
- ✅ `notificationclose` - Analytics de fechamento
- ✅ `push` - Futuro suporte a push notifications

**O que faz:**
- Abre a auditoria quando notificação é clicada
- Reutiliza aba já aberta ou abre nova
- Suporta ações (Abrir, Descartar)

**Status**: ✅ Atualizado

---

### 5. **Hook Customizado**

#### Arquivo: `src/hooks/useNotifications.ts`

Hook que fornece:
- ✅ Lista de notificações não lidas
- ✅ Contagem de não lidas
- ✅ Preferências do usuário
- ✅ Métodos: markAsRead, refreshNotifications
- ✅ Polling automático a cada 5 minutos
- ✅ Event listeners para notificações em tempo real

**Uso:**

```tsx
import { useNotifications } from './hooks/useNotifications'

function MyComponent() {
  const { user } = useAuth()
  const { notifications, unreadCount, preferences } = useNotifications(user?.id)

  return (
    <div>
      <p>Notificações não lidas: {unreadCount}</p>
      {/* ... */}
    </div>
  )
}
```

**Status**: ✅ Arquivo criado

---

### 6. **Supabase Edge Function**

#### Arquivo: `supabase/functions/send-notification-email/index.ts`

Function trigerada por servidor para:
- ✅ Enviar emails de notificação
- ✅ Usar template profissional HTML
- ✅ Incluir link direto para auditoria
- ✅ Registrar log de envio

**Deploy:**

```bash
supabase functions deploy send-notification-email
```

**Status**: ✅ Arquivo criado

---

### 7. **Cron Job - Verificar Auditorias**

#### Como Configurar no Supabase

**Opção A: Supabase Database Functions + pgcron**

```sql
-- Criar function que checa auditorias
CREATE OR REPLACE FUNCTION check_and_send_audit_notifications()
RETURNS void AS $$
BEGIN
  -- Lógica de verificação (implementar seguindo scheduleNotifications.ts)
  -- Para cada auditoria próxima que precisa notificação,
  -- chamar a edge function send-notification-email
END;
$$ LANGUAGE plpgsql;

-- Agendar para rodar a cada hora via pgcron
SELECT cron.schedule('check-audit-notifications', '0 * * * *', 'SELECT check_and_send_audit_notifications();');
```

**Opção B: Vercel Crons + Next.js API Route** (Se tiver)

```ts
// pages/api/cron/check-notifications.ts
export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).send('Unauthorized')
  }

  // Implementar lógica de checkScheduledAuditsForNotification()
  // e chamar sendNotification() para cada auditoria
}
```

**Status**: ⏳ Requer implementação manual

---

## 🚀 Como Usar

### 1. **Setup Inicial**

```bash
# 1. Executar migration SQL no Supabase
# Copiar conteúdo de supabase/migrations/20260306_notifications_system.sql
# Ir a Supabase Dashboard > SQL Editor > Nova Query > Colar e executar

# 2. Deploy Edge Function
supabase functions deploy send-notification-email

# 3. Configurar variáveis de ambiente
# .env
VITE_SUPABASE_URL=seu_url
VITE_SUPABASE_ANON_KEY=sua_key
SITE_URL=https://seu-site.com
```

### 2. **Adicionar NotificationCenter ao Header**

```tsx
// src/components/Header.tsx
import NotificationCenter from './NotificationCenter'
import { useNotifications } from '../hooks/useNotifications'

export default function Header() {
  const { user } = useAuth()
  const { preferences } = useNotifications(user?.id)

  return (
    <header className="flex items-center justify-between">
      {/* Logo, Menu, etc */}
      <NotificationCenter preferences={preferences} />
    </header>
  )
}
```

### 3. **Adicionar Rota de Preferências**

```tsx
// App.tsx
import NotificationPreferences from './pages/NotificationPreferences'

function App() {
  return (
    <Routes>
      {/* ... outras rotas ... */}
      <Route path="/settings/notifications" element={<NotificationPreferences />} />
    </Routes>
  )
}
```

### 4. **Desabilitar Push Notifications (Opcional)**

Se usuário nega permissão de notificação push no navegador, o sistema automaticamente fallback para In-App + Email.

---

## 📱 Características

### Timing de Notificações

| Tempo | Tipo | Urgência |
|------|------|----------|
| 7 dias antes | Preparação | Normal |
| 1 dia antes | Lembrança | Normal |
| 1 hora antes | Alerta | Alta ⚠️ |
| No momento | Agora | Crítica 🚨 |

### Canais de Notificação

| Canal | Método | Quando |
|-------|--------|--------|
| **In-App** | Toast/Banner | Sempre que usuário está usando |
| **Push** | Service Worker | Desktop + Mobile (se ativo) |
| **Email** | SMTP | Configurável pelo usuário |

### Silenciar Notificações

Usuário pode definir "Horários Silenciosos" (ex: 22h-8h) quando notificações não são enviadas.

---

## 🔧 Troubleshooting

### Push Notifications não funcionam
- ✅ Verificar se `serviceWorker` está registrado
- ✅ Verificar permissão do navegador (chrome://settings/content/notifications)
- ✅ Verificar console do DevTools para erros

### Notificações não aparecem
- ✅ Verificar preferences do usuário em `notifications_preferences`
- ✅ Verificar se `notifications_enabled = true`
- ✅ Verificar quiet hours

### Email não é enviado
- ✅ Configurar provider de email (Resend, SendGrid, etc.)
- ✅ Verificar variável `email_enabled` do usuário
- ✅ Verificar logs em `notifications_log`

---

## 📊 Arquivos Criados

```
✅ supabase/migrations/20260306_notifications_system.sql
✅ src/lib/scheduleNotifications.ts
✅ src/components/NotificationCenter.tsx
✅ src/pages/NotificationPreferences.tsx
✅ src/hooks/useNotifications.ts
✅ supabase/functions/send-notification-email/index.ts
✅ public/service-worker.js (atualizado)
```

---

## 🎯 Próximos Passos

1. ⏳ Executar migration SQL no Supabase
2. ⏳ Deploy Edge Function
3. ⏳ Integrar NotificationCenter no Header
4. ⏳ Integrar página de Preferências no menu Settings
5. ⏳ Configurar Cron Job para verificar auditorias
6. ⏳ Testar em múltiplos browsers/devices
7. ⏳ Configurar provider de email

---

## 📚 Referências

- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

---

**Status**: ✅ Sistema implementado e pronto para integração!
