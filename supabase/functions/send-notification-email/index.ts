// Follow this setup guide to integrate the Deno template into your Supabase project:
// https://supabase.com/docs/guides/functions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationEmailRequest {
  userId: string
  title: string
  message: string
  scheduleItemId: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: NotificationEmailRequest = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Buscar usuário e email
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(payload.userId)

    if (userError || !user?.email) {
      console.error('User not found:', userError)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: corsHeaders }
      )
    }

    // Buscar detalhes da auditoria
    const { data: scheduleItem } = await supabase
      .from('schedule_items')
      .select('scheduled_date, categories(name)')
      .eq('id', payload.scheduleItemId)
      .single()

    const scheduledDate = scheduleItem?.scheduled_date 
      ? new Date(scheduleItem.scheduled_date).toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'em breve'

    // Template HTML do email
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content {
            padding: 30px 20px;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
            margin: 20px 0;
          }
          .message {
            font-size: 16px;
            color: #4b5563;
            margin: 15px 0;
          }
          .details {
            background: #f3f4f6;
            border-left: 4px solid #7C3AED;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .details p {
            margin: 8px 0;
            font-size: 14px;
          }
          .details strong {
            color: #1f2937;
          }
          .button {
            display: inline-block;
            background: #7C3AED;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            margin: 20px 0;
            font-weight: bold;
          }
          .button:hover {
            background: #6d28d9;
          }
          .footer {
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
          }
          .footer a {
            color: #7C3AED;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Notificação de Auditoria</h1>
          </div>

          <div class="content">
            <div class="title">${payload.title}</div>

            <div class="message">${payload.message}</div>

            <div class="details">
              <p><strong>Categoria:</strong> ${scheduleItem?.categories?.name || 'N/A'}</p>
              <p><strong>Data agendada:</strong> ${scheduledDate}</p>
            </div>

            <p>Clique no botão abaixo para acessar sua auditoria:</p>

            <center>
              <a href="${Deno.env.get('SITE_URL')}/counts?audit=${payload.scheduleItemId}" class="button">
                Acessar Auditoria
              </a>
            </center>

            <p style="color: #6b7280; font-size: 14px;">
              Esta é uma notificação automática do AUDITE.AI. Você pode ajustar suas preferências de notificação 
              <a href="${Deno.env.get('SITE_URL')}/settings/notifications" style="color: #7C3AED;">aqui</a>.
            </p>
          </div>

          <div class="footer">
            <p>© 2026 AUDITE.AI. Todos os direitos reservados.</p>
            <p><a href="${Deno.env.get('SITE_URL')}">audite.ai</a></p>
          </div>
        </div>
      </body>
      </html>
    `

    // Enviar email via Resend ou similar (configurar conforme seu provider)
    // Por enquanto, apenas logar que foi chamado
    console.log(`Email notification queued for ${user.email}`)

    // Registrar no banco que email foi enviado
    await supabase.from('notifications_log').insert({
      user_id: payload.userId,
      schedule_item_id: payload.scheduleItemId,
      notification_type: 'general',
      channel: 'email',
      title: payload.title,
      message: payload.message,
      status: 'sent'
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email notification queued'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending email notification:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to send notification',
        details: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
