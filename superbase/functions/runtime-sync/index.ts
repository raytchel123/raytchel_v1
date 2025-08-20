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
    const path = url.pathname.replace('/functions/v1/runtime-sync', '')

    // Autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (true) {
      case path === '/sync' && req.method === 'POST':
        return await handleRuntimeSync(req)
      
      case path === '/publish' && req.method === 'POST':
        return await handlePublishSnapshot(req)
      
      case path === '/rollback' && req.method === 'POST':
        return await handleRollbackSnapshot(req)
      
      case path === '/quote' && req.method === 'POST':
        return await handleCalculateQuote(req)
      
      case path === '/appointment' && req.method === 'POST':
        return await handleBookAppointment(req)

      default:
        return new Response(
          JSON.stringify({ error: 'Route not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Runtime Sync Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleRuntimeSync(req: Request): Promise<Response> {
  try {
    const { tenant_id, since_ts } = await req.json()
    
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data, error } = await supabase.rpc('get_runtime_diff', {
      p_tenant_id: tenant_id,
      p_since_ts: since_ts ? new Date(since_ts).toISOString() : null
    })

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        ...data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in runtime sync:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handlePublishSnapshot(req: Request): Promise<Response> {
  try {
    const { tenant_id, snapshot_data, created_by } = await req.json()
    
    if (!tenant_id || !snapshot_data) {
      return new Response(
        JSON.stringify({ error: 'tenant_id and snapshot_data required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data, error } = await supabase.rpc('publish_snapshot', {
      p_tenant_id: tenant_id,
      p_snapshot_data: snapshot_data,
      p_created_by: created_by
    })

    if (error) throw error

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error publishing snapshot:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleRollbackSnapshot(req: Request): Promise<Response> {
  try {
    const { tenant_id, target_version, created_by } = await req.json()
    
    if (!tenant_id || !target_version) {
      return new Response(
        JSON.stringify({ error: 'tenant_id and target_version required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar snapshot da versão alvo
    const { data: targetSnapshot, error: fetchError } = await supabase
      .from('snapshots')
      .select('snapshot_data')
      .eq('tenant_id', tenant_id)
      .eq('version', target_version)
      .single()

    if (fetchError) throw fetchError

    // Publicar como nova versão
    const { data, error } = await supabase.rpc('publish_snapshot', {
      p_tenant_id: tenant_id,
      p_snapshot_data: targetSnapshot.snapshot_data,
      p_created_by: created_by
    })

    if (error) throw error

    // Log de rollback
    await supabase.from('audit_logs').insert([{
      event_type: 'snapshot_rollback',
      user_id: created_by,
      metadata: {
        tenant_id,
        target_version,
        new_version: data.version
      }
    }])

    return new Response(
      JSON.stringify({
        success: true,
        rolled_back_to: target_version,
        new_version: data.version
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error rolling back snapshot:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleCalculateQuote(req: Request): Promise<Response> {
  try {
    const { tenant_id, product_type, specifications } = await req.json()
    
    if (!tenant_id || !product_type || !specifications) {
      return new Response(
        JSON.stringify({ error: 'tenant_id, product_type and specifications required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data, error } = await supabase.rpc('calculate_quote', {
      p_tenant_id: tenant_id,
      p_product_type: product_type,
      p_specifications: specifications
    })

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        ...data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error calculating quote:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleBookAppointment(req: Request): Promise<Response> {
  try {
    const { 
      tenant_id, 
      contact_id, 
      contact_name, 
      contact_phone, 
      slot_date, 
      slot_time, 
      service_type 
    } = await req.json()
    
    if (!tenant_id || !contact_id || !slot_date || !slot_time) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar disponibilidade
    const { data: slot, error: slotError } = await supabase
      .from('appointment_slots')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('slot_date', slot_date)
      .eq('slot_time', slot_time)
      .eq('status', 'available')
      .single()

    if (slotError || !slot) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Slot not available' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Reservar slot
    const { error: updateError } = await supabase
      .from('appointment_slots')
      .update({
        status: 'booked',
        contact_id,
        customer_name: contact_name,
        customer_phone: contact_phone,
        service_type: service_type || 'consulta_joias'
      })
      .eq('id', slot.id)

    if (updateError) throw updateError

    // Criar evento de agendamento
    await supabase.from('outbox_events').insert([{
      tenant_id,
      event_type: 'appointment.booked',
      payload: {
        appointment_id: slot.id,
        contact_id,
        contact_name,
        contact_phone,
        slot_date,
        slot_time,
        service_type
      }
    }])

    return new Response(
      JSON.stringify({
        success: true,
        appointment: {
          id: slot.id,
          date: slot_date,
          time: slot_time,
          customer_name: contact_name,
          service_type
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error booking appointment:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}