import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Credenciais WhatsApp Business API
const WHATSAPP_TOKEN = Deno.env.get('FACEBOOK_TOKEN') || 'EAAZA0beuOn34BPEM4keCSrT67uDrROBwFiRjx6j4N1Sk9CheiTHthkwgs8cMINizdyHVxNruxKkZBZCMcBYtf0zQ2G4iAOJdX2FKsSBU2dsN7yuS1Fe6yZCYU42EwLrWFgkwLsrf8npOZBuZCNZBNeCjBKTVatOXkUHOC1AEXPbvqHDRwIGZCVZB7SBUwGKAf2d2M7uV1PrPQ3vJeMZAP12bmFvgVNknjGAwyZCk3fyqN0ZB1ORqlAZDZD'
const PHONE_NUMBER_ID = Deno.env.get('FACEBOOK_WPP_ID') || '1320457612840383'
const VERIFY_TOKEN = Deno.env.get('FACEBOOK_CALLBACK_TOKEN') || 'raytchel_webhook_2024'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // VERIFICAÇÃO GET (obrigatória pelo Meta)
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')
      
      console.log('🔍 Webhook verification:', { mode, token, challenge })
      
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verified successfully')
        return new Response(challenge, { status: 200, headers: corsHeaders })
      }
      
      console.log('❌ Webhook verification failed')
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }

    // PROCESSAMENTO POST - Mensagens e Status
    if (req.method === 'POST') {
      const body = await req.json()
      console.log('📨 Webhook received:', JSON.stringify(body, null, 2))
      
      const entry = body.entry?.[0]
      if (!entry?.changes) {
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      const change = entry.changes[0]
      const value = change.value

      // Processar mensagens recebidas
      if (value.messages) {
        for (const message of value.messages) {
          await processIncomingMessage(message, value.contacts?.[0])
        }
      }

      // Processar atualizações de status
      if (value.statuses) {
        for (const status of value.statuses) {
          await processStatusUpdate(status)
        }
      }
      
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})

// PROCESSAR MENSAGEM RECEBIDA
async function processIncomingMessage(message: any, contact?: any): Promise<void> {
  try {
    const from = message.from
    const messageContent = extractMessageContent(message)
    const messageId = message.id
    
    console.log(`📩 Message from ${from}: "${messageContent}"`)
    
    // Salvar mensagem recebida no banco
    await saveMessage({
      direction: 'inbound',
      content: messageContent,
      type: message.type,
      status: 'received',
      metadata: {
        whatsapp_message_id: messageId,
        sender: from,
        contact_name: contact?.profile?.name,
        timestamp: message.timestamp,
        message_type: message.type
      }
    })
    
    // Marcar como lida
    await markAsRead(messageId)
    
    // Indicador de digitação
    await setTypingIndicator(from, 'typing_on')
    
    // Obter ou criar conversa
    const conversation = await getOrCreateConversation(from)
    
    // Gerar resposta com IA
    const aiResponse = await generateAIResponse(messageContent, conversation)
    
    // Aguardar antes de responder (humanização)
    const botAwait = parseInt(Deno.env.get('BOT_AWAIT') || '3000')
    await new Promise(resolve => setTimeout(resolve, Math.min(botAwait, 5000)))
    
    // Enviar resposta
    const whatsappResponse = await sendTextMessage(from, aiResponse)
    
    // Salvar resposta no banco
    await saveMessage({
      direction: 'outbound',
      content: aiResponse,
      type: 'text',
      status: 'sent',
      metadata: {
        whatsapp_message_id: whatsappResponse.messages?.[0]?.id,
        recipient: from,
        ai_generated: true,
        conversation_id: conversation.id,
        timestamp: new Date().toISOString()
      }
    })
    
    console.log(`✅ Response sent to ${from}: "${aiResponse}"`)
    
  } catch (error) {
    console.error('❌ Error processing message:', error)
    
    // Enviar mensagem de fallback
    try {
      await sendTextMessage(
        message.from, 
        'Desculpe, estou tendo dificuldades técnicas no momento. Um de nossos especialistas entrará em contato em breve. 🤝'
      )
    } catch (fallbackError) {
      console.error('❌ Error sending fallback message:', fallbackError)
    }
  }
}

// PROCESSAR ATUALIZAÇÃO DE STATUS
async function processStatusUpdate(status: any): Promise<void> {
  try {
    console.log(`📊 Status update: ${status.id} -> ${status.status}`)
    
    // Atualizar status da mensagem no banco
    await supabase
      .from('whatsapp_messages')
      .update({
        status: status.status,
        metadata: {
          status_timestamp: status.timestamp,
          recipient_id: status.recipient_id
        }
      })
      .eq('metadata->whatsapp_message_id', status.id)
    
  } catch (error) {
    console.error('❌ Error processing status update:', error)
  }
}

// EXTRAIR CONTEÚDO DA MENSAGEM
function extractMessageContent(message: any): string {
  switch (message.type) {
    case 'text':
      return message.text?.body || ''
    case 'image':
      return message.image?.caption || 'Imagem enviada'
    case 'document':
      return message.document?.caption || 'Documento enviado'
    case 'audio':
      return 'Áudio enviado'
    case 'video':
      return 'Vídeo enviado'
    case 'interactive':
      if (message.interactive?.type === 'button_reply') {
        return message.interactive.button_reply.title
      } else if (message.interactive?.type === 'list_reply') {
        return message.interactive.list_reply.title
      }
      return 'Resposta interativa'
    default:
      return `Mensagem do tipo: ${message.type}`
  }
}

// MARCAR COMO LIDA
async function markAsRead(messageId: string): Promise<void> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        })
      }
    )

    if (!response.ok) {
      console.error('❌ Error marking message as read:', await response.text())
    }
  } catch (error) {
    console.error('❌ Error in markAsRead:', error)
  }
}

// INDICADOR DE DIGITAÇÃO
async function setTypingIndicator(to: string, action: 'typing_on' | 'typing_off'): Promise<void> {
  try {
    await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'typing',
          typing: { action }
        })
      }
    )
  } catch (error) {
    console.error('❌ Error setting typing indicator:', error)
  }
}

// ENVIAR MENSAGEM DE TEXTO
async function sendTextMessage(to: string, text: string): Promise<any> {
  try {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: { 
        body: text,
        preview_url: true
      }
    }
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      }
    )

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Message sent successfully:', result)
      return result
    } else {
      console.error('❌ Error sending message:', result)
      throw new Error(result.error?.message || 'Failed to send message')
    }
  } catch (error) {
    console.error('❌ Error in sendTextMessage:', error)
    throw error
  }
}

// GERAR RESPOSTA COM IA
async function generateAIResponse(message: string, conversation: any): Promise<string> {
  try {
    // Chamar função OpenAI
    const response = await fetch(`${supabaseUrl}/functions/v1/openai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        context: {
          conversation_id: conversation.id,
          customer_profile: conversation.metadata?.profile,
          conversation_stage: conversation.metadata?.stage || 'initial',
          previous_messages: conversation.recent_messages || []
        }
      })
    })

    if (!response.ok) {
      throw new Error('OpenAI service unavailable')
    }

    const data = await response.json()
    return data.content || 'Como posso ajudar você? 😊'
    
  } catch (error) {
    console.error('❌ Error generating AI response:', error)
    return 'Olá! Como posso ajudar você hoje? 😊'
  }
}

// OBTER OU CRIAR CONVERSA
async function getOrCreateConversation(phoneNumber: string): Promise<any> {
  try {
    // Tentar encontrar conversa existente
    const { data: existingConversation, error: findError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('whatsapp_user_id', phoneNumber)
      .eq('status', 'active')
      .single()

    if (findError && findError.code !== 'PGRST116') {
      throw findError
    }

    if (existingConversation) {
      return existingConversation
    }

    // Criar nova conversa
    const { data: newConversation, error: createError } = await supabase
      .from('whatsapp_conversations')
      .insert([{
        tenant_id: '00000000-0000-0000-0000-000000000001', // Zaffira
        whatsapp_user_id: phoneNumber,
        phone_number: phoneNumber,
        status: 'active',
        metadata: {
          source: 'whatsapp_official',
          created_at: new Date().toISOString()
        }
      }])
      .select()
      .single()

    if (createError) throw createError

    return newConversation
  } catch (error) {
    console.error('❌ Error getting/creating conversation:', error)
    throw error
  }
}

// SALVAR MENSAGEM NO BANCO
async function saveMessage(data: {
  direction: 'inbound' | 'outbound';
  content: string;
  type: string;
  status: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await supabase.from('whatsapp_messages').insert([{
      ...data,
      created_at: new Date().toISOString()
    }])
  } catch (error) {
    console.error('❌ Error saving message:', error)
  }
}