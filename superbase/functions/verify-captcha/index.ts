import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RECAPTCHA_SECRET = Deno.env.get('RECAPTCHA_SECRET')
const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

serve(async (req) => {
  try {
    const { token } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const formData = new FormData()
    formData.append('secret', RECAPTCHA_SECRET)
    formData.append('response', token)

    const verifyResponse = await fetch(VERIFY_URL, {
      method: 'POST',
      body: formData
    })

    const result = await verifyResponse.json()

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: 'CAPTCHA verification failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})