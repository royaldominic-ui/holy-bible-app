// ═══════════════════════════════════════════════════════════════
// CLOUDFLARE WORKER — Claude API Proxy
// Deploy at: workers.cloudflare.com (free tier: 100k req/day)
//
// 1. Go to workers.cloudflare.com → Create Worker
// 2. Paste this code
// 3. Add Secret: ANTHROPIC_API_KEY = "sk-ant-..."
// 4. Update API_ENDPOINT in ai-assistant.js to your worker URL
// ═══════════════════════════════════════════════════════════════

export default {
  async fetch(request, env) {
    // CORS — allow your GitHub Pages domain
    var ALLOWED_ORIGINS = [
      'https://YOUR-USERNAME.github.io',
      'http://localhost:3000',
      'http://127.0.0.1:5500'
    ];

    var origin = request.headers.get('Origin') || '';
    var corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      var body = await request.json();

      // Rate limiting per IP (simple)
      var ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      var rateLimitKey = 'rl:' + ip;
      // Note: For proper rate limiting, use Cloudflare KV

      // Forward to Anthropic
      var response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: body.model || 'claude-sonnet-4-20250514',
          max_tokens: Math.min(body.max_tokens || 600, 1000), // cap at 1000
          system: body.system || '',
          messages: body.messages || []
        })
      });

      var data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch(e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
