import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// Environment variables
const FACEBOOK_TOKEN = Deno.env.get('FACEBOOK_TOKEN') || ''
const FACEBOOK_WPP_ID = Deno.env.get('FACEBOOK_WPP_ID') || ''
const VERIFY_TOKEN = Deno.env.get('FACEBOOK_CALLBACK_TOKEN') || 'raytchel_webhook_2024'
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // Webhook verification (required by Meta)
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

    // Process incoming messages
    if (req.method === 'POST') {
      const body = await req.json()
      console.log('📨 Webhook received:', JSON.stringify(body, null, 2))
      
      const entry = body.entry?.[0]
      if (!entry?.changes) {
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      const change = entry.changes[0]
      const value = change.value

      // Process messages
      if (value.messages) {
        for (const message of value.messages) {
          await processMessage(message, value.contacts?.[0])
        }
      }

      // Process status updates
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

async function processMessage(message: any, contact?: any): Promise<void> {
  try {
    const from = message.from
    const messageContent = extractMessageContent(message)
    const messageId = message.id
    
    console.log(`📩 Message from ${from}: "${messageContent}"`)
    
    // Mark as read
    await markAsRead(messageId)
    
    // Set typing indicator
    await setTypingIndicator(from, 'typing_on')
    
    // Save incoming message to database
    await saveMessage({
      direction: 'inbound',
      content: messageContent,
      type: message.type,
      status: 'received',
      metadata: {
        whatsapp_message_id: messageId,
        sender: from,
        contact_name: contact?.profile?.name,
        timestamp: message.timestamp
      }
    })
    
    // Get conversation context from database
    const context = await getConversationContext(from)
    
    // Generate AI response
    const aiResponse = await generateAIResponse(messageContent, context)
    
    // Wait before responding (human-like delay)
    const botAwait = parseInt(Deno.env.get('BOT_AWAIT') || '15000')
    await new Promise(resolve => setTimeout(resolve, Math.min(botAwait, 5000)))
    
    // Send response
    const whatsappResponse = await sendTextMessage(from, aiResponse)
    
    // Save AI response to database
    await saveMessage({
      direction: 'outbound',
      content: aiResponse,
      type: 'text',
      status: 'sent',
      metadata: {
        whatsapp_message_id: whatsappResponse.messages?.[0]?.id,
        recipient: from,
        ai_generated: true,
        timestamp: new Date().toISOString()
      }
    })
    
    console.log(`✅ Response sent to ${from}: "${aiResponse}"`)
    
  } catch (error) {
    console.error('❌ Error processing message:', error)
    
    // Send fallback message
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

async function processStatusUpdate(status: any): Promise<void> {
  try {
    console.log(`📊 Status update: ${status.id} -> ${status.status}`)
    
    // Update message status in database
    await updateMessageStatus(status.id, status.status, {
      status_timestamp: status.timestamp,
      recipient_id: status.recipient_id
    })
    
  } catch (error) {
    console.error('❌ Error processing status update:', error)
  }
}

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
    default:
      return `Mensagem do tipo: ${message.type}`
  }
}

async function markAsRead(messageId: string): Promise<void> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${FACEBOOK_WPP_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FACEBOOK_TOKEN}`,
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

async function setTypingIndicator(to: string, action: 'typing_on' | 'typing_off'): Promise<void> {
  try {
    await fetch(
      `https://graph.facebook.com/v22.0/${FACEBOOK_WPP_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FACEBOOK_TOKEN}`,
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

async function sendTextMessage(to: string, text: string): Promise<any> {
  try {
    const payload = {
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: text }
    }
    
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${FACEBOOK_WPP_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FACEBOOK_TOKEN}`,
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

async function generateAIResponse(message: string, context: any[]): Promise<string> {
  try {
    const systemPrompt = `Você é a Raytchel, assistente virtual da Zaffira Joalheria.

- Você receberá as mensagens com a data no inicio e nome no inicio, porem você não deve enviar com data e nome, apenas a mensagem
- Não passe serviços para o cliente que não foram obtidos pela função do sitema get_avaliable_services
- Não passe valores de serviços que não foram obtidos pela função do sistema get_avaliable_services
- Nunca informe o cliente que uma função foi realizada no sistema sem ter recebido alguma confirmação via uma function disponivel

Seja sempre profissional, cordial e focada em ajudar com joias personalizadas.`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...context,
      { role: 'user', content: message }
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') || 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'OpenAI API error')
    }

    const data = await response.json()
    return data.choices[0].message.content
    
  } catch (error) {
    console.error('❌ Error generating AI response:', error)
    return 'Desculpe, estou tendo dificuldades técnicas no momento. Um de nossos especialistas entrará em contato em breve. 🤝'
  }
}

async function getConversationContext(userId: string): Promise<any[]> {
  try {
    // This would fetch from your Supabase database
    // For now, return empty context
    return []
  } catch (error) {
    console.error('❌ Error getting conversation context:', error)
    return []
  }
}

async function saveMessage(data: {
  direction: 'inbound' | 'outbound';
  content: string;
  type: string;
  status: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    // This would save to your Supabase database
    console.log('💾 Saving message:', data)
  } catch (error) {
    console.error('❌ Error saving message:', error)
  }
}

async function updateMessageStatus(messageId: string, status: string, metadata: any): Promise<void> {
  try {
    // This would update message status in your Supabase database
    console.log('📊 Updating message status:', { messageId, status, metadata })
  } catch (error) {
    console.error('❌ Error updating message status:', error)
  }
}