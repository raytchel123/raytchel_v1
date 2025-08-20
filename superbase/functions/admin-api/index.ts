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
    const path = url.pathname.replace('/functions/v1/admin-api', '')
    const method = req.method

    // Authentication check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route handling
    switch (true) {
      // Flow routes
      case path === '/flows' && method === 'POST':
        return await handleCreateFlow(req)
      
      case path === '/flows' && method === 'GET':
        return await handleGetFlows(req)
      
      case path.startsWith('/flows/') && path.endsWith('/publish') && method === 'POST':
        return await handlePublishFlow(req, path)
      
      case path.startsWith('/flows/') && path.endsWith('/rollback') && method === 'POST':
        return await handleRollbackFlow(req, path)
      
      case path.startsWith('/flows/') && method === 'GET':
        return await handleGetFlow(req, path)
      
      case path.startsWith('/flows/') && method === 'PUT':
        return await handleUpdateFlow(req, path)

      // Runtime sync
      case path === '/runtime/sync' && method === 'POST':
        return await handleRuntimeSync(req)

      // Webhook events
      case path.startsWith('/webhooks/') && method === 'POST':
        return await handleWebhookEvent(req, path)

      // Metrics
      case path === '/metrics/daily' && method === 'GET':
        return await handleGetDailyMetrics(req)

      // Conversations
      case path === '/conversations' && method === 'GET':
        return await handleGetConversations(req)
      
      case path.startsWith('/conversations/') && path.endsWith('/resolve_handoff') && method === 'POST':
        return await handleResolveHandoff(req, path)

      default:
        return new Response(
          JSON.stringify({ error: 'Route not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('API Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Flow handlers
async function handleCreateFlow(req: Request) {
  const { name, description, org_id } = await req.json()
  
  const { data, error } = await supabase
    .from('flows')
    .insert([{
      org_id,
      name,
      description,
      status: 'draft',
      version: 1,
      graph_json: {
        nodes: [{ id: 'start', type: 'start', position: { x: 100, y: 100 } }],
        start: 'start'
      },
      created_by: 'system' // TODO: Get from JWT
    }])
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetFlows(req: Request) {
  const url = new URL(req.url)
  const orgId = url.searchParams.get('org_id')
  const status = url.searchParams.get('status')
  
  if (!orgId) {
    return new Response(
      JSON.stringify({ error: 'org_id parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let query = supabase
    .from('flows')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handlePublishFlow(req: Request, path: string) {
  const flowId = path.split('/')[2]
  
  const { data, error } = await supabase.rpc('publish_flow', {
    flow_id: flowId,
    actor_id: 'system' // TODO: Get from JWT
  })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleRollbackFlow(req: Request, path: string) {
  const flowId = path.split('/')[2]
  
  const { data, error } = await supabase.rpc('rollback_flow', {
    flow_id: flowId,
    actor_id: 'system' // TODO: Get from JWT
  })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleRuntimeSync(req: Request) {
  const { org_id, since_ts } = await req.json()
  
  const { data, error } = await supabase.rpc('get_runtime_config', {
    org_id_param: org_id,
    since_ts
  })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleWebhookEvent(req: Request, path: string) {
  const topic = path.split('/')[2]
  const { org_id, event_type, payload } = await req.json()
  
  // TODO: Validate HMAC signature
  
  const { data, error } = await supabase.rpc('process_webhook_event', {
    org_id_param: org_id,
    event_type,
    payload
  })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetDailyMetrics(req: Request) {
  const url = new URL(req.url)
  const orgId = url.searchParams.get('org_id')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  
  if (!orgId) {
    return new Response(
      JSON.stringify({ error: 'org_id parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let query = supabase
    .from('metrics_daily')
    .select('*')
    .eq('org_id', orgId)
    .order('date', { ascending: false })

  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)

  const { data, error } = await query

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetConversations(req: Request) {
  const url = new URL(req.url)
  const orgId = url.searchParams.get('org_id')
  const status = url.searchParams.get('status')
  
  if (!orgId) {
    return new Response(
      JSON.stringify({ error: 'org_id parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let query = supabase
    .from('conversations')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleResolveHandoff(req: Request, path: string) {
  const conversationId = path.split('/')[2]
  const { note } = await req.json()
  
  const { data: conversation, error: getError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (getError) {
    return new Response(
      JSON.stringify({ error: getError.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { error } = await supabase
    .from('conversations')
    .update({
      status: 'resolved',
      assigned_agent_id: 'system', // TODO: Get from JWT
      metadata: {
        ...conversation.metadata,
        resolution_note: note,
        resolved_at: new Date().toISOString()
      }
    })
    .eq('id', conversationId)

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetFlow(req: Request, path: string) {
  const flowId = path.split('/')[2]
  
  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .eq('id', flowId)
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleUpdateFlow(req: Request, path: string) {
  const flowId = path.split('/')[2]
  const updates = await req.json()
  
  // Validate graph if provided
  if (updates.graph_json) {
    const { data: validation } = await supabase.rpc('validate_flow_graph', {
      graph_json: updates.graph_json
    })

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ 
          error: 'Flow validation failed', 
          validation_errors: validation.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  const { data, error } = await supabase
    .from('flows')
    .update(updates)
    .eq('id', flowId)
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}