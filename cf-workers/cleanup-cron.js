export default {

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCleanup(env))
  },

  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/trigger' && request.method === 'POST') {

      const auth = request.headers.get('Authorization')
      if (auth !== `Bearer ${env.CLEANUP_SECRET}`) {
        return new Response('Unauthorized', { status: 401 })
      }
      const result = await runCleanup(env)
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return new Response('Lama Stylers Cleanup Cron 🧹', { status: 200 })
  }
}

async function runCleanup(env) {
  const siteUrl      = env.NETLIFY_SITE_URL
  const secret       = env.CLEANUP_SECRET

  if (!siteUrl || !secret) {
    console.error('[cleanup-cron] NETLIFY_SITE_URL hoặc CLEANUP_SECRET chưa set')
    return { success: false, error: 'Missing env vars' }
  }

  const endpoint = `${siteUrl.replace(/\/$/, '')}/.netlify/functions/cleanupTrigger`

  try {
    const resp = await fetch(endpoint, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Cleanup-Secret': secret,
      },

    })

    if (!resp.ok) {
      const text = await resp.text()
      console.error(`[cleanup-cron] HTTP ${resp.status}: ${text}`)
      return { success: false, status: resp.status }
    }

    const data = await resp.json()
    console.log('[cleanup-cron] OK:', JSON.stringify(data))
    return { success: true, data }

  } catch (e) {
    console.error('[cleanup-cron] Fetch error:', e.message)
    return { success: false, error: e.message }
  }
}
