import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY = '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'
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

serve(async (req) => {
  try {
    const { message, context } = await req.json()

    // Build system prompt based on context
    const systemPrompt = `Você é a Raytchel, uma assistente virtual especializada em joalheria da Zaffira.

${context ? `Contexto do cliente:\n${JSON.stringify(context, null, 2)}\n` : ''}

Diretrizes:
- Seja sempre profissional e cordial
- Use linguagem clara e acessível
- Forneça informações precisas sobre produtos
- Sugira opções baseadas nas preferências do cliente
- Esclareça dúvidas sobre materiais e processos
- Mantenha o foco em converter leads em vendas
- Use emojis com moderação
- Enfatize a qualidade e exclusividade das joias Zaffira`

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 250,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'OpenAI API error')
    }

    const data = await response.json()

    // Calculate confidence score
    let confidence = 0.7
    if (data.choices[0].finish_reason === 'stop') confidence += 0.1
    if (context?.intent && data.choices[0].message.content.toLowerCase().includes(context.intent)) {
      confidence += 0.1
    }
    confidence = Math.min(0.98, confidence)

    return new Response(
      JSON.stringify({
        content: data.choices[0].message.content,
        confidence
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('OpenAI API error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: 'openai_error'
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})