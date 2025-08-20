import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace('/functions/v1/guardrails-api', '')
    const method = req.method

    // Authentication check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (true) {
      case path === '/validate' && method === 'POST':
        return await handleValidateResponse(req)
      
      case path === '/check-price' && method === 'POST':
        return await handleCheckPrice(req)
      
      case path === '/check-confidence' && method === 'POST':
        return await handleCheckConfidence(req)
      
      case path === '/log-decision' && method === 'POST':
        return await handleLogDecision(req)
      
      case path === '/safe-recommendation' && method === 'POST':
        return await handleSafeRecommendation(req)

      default:
        return new Response(
          JSON.stringify({ error: 'Route not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Guardrails API Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleValidateResponse(req: Request) {
  try {
    const { 
      tenant_id, 
      intent, 
      confidence, 
      response_content, 
      context 
    } = await req.json()

    if (!tenant_id || !intent || confidence === undefined || !response_content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const guardrails = []
    let isValid = true
    let safeResponse = response_content
    let requiresHandoff = false

    // Check confidence guardrail
    const { data: confidenceCheck, error: confError } = await supabase.rpc('check_confidence_guardrail', {
      p_tenant_id: tenant_id,
      p_intent: intent,
      p_confidence: confidence,
      p_category: context?.category || 'general'
    })

    if (confError) throw confError

    if (confidenceCheck.triggered) {
      guardrails.push(confidenceCheck)
      isValid = false
      safeResponse = confidenceCheck.confirmation_template
    }

    // Check price guardrail if response mentions price
    if (response_content.includes('R$') || response_content.includes('preço') || response_content.includes('valor')) {
      const productId = context?.productId || context?.product_id
      
      if (productId) {
        const { data: priceCheck, error: priceError } = await supabase.rpc('check_price_guardrail', {
          p_tenant_id: tenant_id,
          p_product_id: productId,
          p_intent: intent
        })

        if (priceError) throw priceError

        if (priceCheck.triggered) {
          guardrails.push(priceCheck)
          isValid = false
          safeResponse = priceCheck.fallback_message
          requiresHandoff = priceCheck.handoff_trigger
        }
      }
    }

    // Check for sensitive information patterns
    const sensitivePatterns = [
      { pattern: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, type: 'cpf' },
      { pattern: /\b\d{16}\b/, type: 'card_number' },
      { pattern: /\b\d{3}\b/, type: 'cvv' },
      { pattern: /senha|password/i, type: 'password' }
    ]

    for (const { pattern, type } of sensitivePatterns) {
      if (pattern.test(response_content)) {
        guardrails.push({
          triggered: true,
          reason: 'sensitive_info',
          fallback_message: 'Para informações sensíveis, prefiro conectar você com um especialista. Posso agendar?',
          handoff_trigger: true,
          evidence: { sensitive_type: type }
        })
        isValid = false
        requiresHandoff = true
        safeResponse = 'Para informações sensíveis, prefiro conectar você com um especialista. Posso agendar?'
        break
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        is_valid: isValid,
        guardrails,
        safe_response: safeResponse,
        requires_handoff: requiresHandoff
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error validating response:', error)
    
    // Safe fallback response
    return new Response(
      JSON.stringify({
        success: false,
        is_valid: false,
        guardrails: [{
          triggered: true,
          reason: 'system_error',
          fallback_message: 'Deixe-me conectar você com um especialista para garantir informações precisas.',
          handoff_trigger: true
        }],
        safe_response: 'Deixe-me conectar você com um especialista para garantir informações precisas.',
        requires_handoff: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleCheckPrice(req: Request) {
  try {
    const { tenant_id, product_id, intent } = await req.json()

    const { data, error } = await supabase.rpc('check_price_guardrail', {
      p_tenant_id: tenant_id,
      p_product_id: product_id,
      p_intent: intent
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, ...data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleCheckConfidence(req: Request) {
  try {
    const { tenant_id, intent, confidence, category } = await req.json()

    const { data, error } = await supabase.rpc('check_confidence_guardrail', {
      p_tenant_id: tenant_id,
      p_intent: intent,
      p_confidence: confidence,
      p_category: category || 'general'
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, ...data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleLogDecision(req: Request) {
  try {
    const { 
      tenant_id, 
      conversation_id, 
      intent, 
      confidence, 
      guardrail_triggered, 
      evidence, 
      fallback_used, 
      handoff_offered 
    } = await req.json()

    const { data, error } = await supabase.rpc('log_guardrail_decision', {
      p_tenant_id: tenant_id,
      p_conversation_id: conversation_id,
      p_intent: intent,
      p_confidence: confidence,
      p_guardrail_triggered: guardrail_triggered,
      p_evidence: evidence || {},
      p_fallback_used: fallback_used || false,
      p_handoff_offered: handoff_offered || false
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, log_id: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleSafeRecommendation(req: Request) {
  try {
    const { 
      tenant_id, 
      budget_min, 
      budget_max, 
      material, 
      category 
    } = await req.json()

    const { data, error } = await supabase.rpc('get_safe_product_recommendation', {
      p_tenant_id: tenant_id,
      p_budget_min: budget_min,
      p_budget_max: budget_max,
      p_material: material,
      p_category: category || 'aliancas'
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, ...data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}