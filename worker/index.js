export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-upload-url, x-download-url',
      'Access-Control-Max-Age': '86400',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    try {
      if (path.includes('/download')) {
        const target = request.headers.get('x-download-url')
        if (!target) return new Response('{"msg":"missing x-download-url"}', { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
        const resp = await fetch(target)
        const ct = resp.headers.get('Content-Type') || 'application/octet-stream'
        return new Response(resp.body, { status: resp.status, headers: { ...cors, 'Content-Type': ct } })
      }

      if (path.includes('/upload')) {
        const target = request.headers.get('x-upload-url')
        if (!target) return new Response('{"msg":"missing x-upload-url"}', { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
        const cl = request.headers.get('Content-Length')
        if (cl && parseInt(cl) > 200 * 1024 * 1024) {
          return new Response('{"msg":"文件超过200MB限制"}', { status: 413, headers: { ...cors, 'Content-Type': 'application/json' } })
        }
        try {
          const resp = await fetch(target, { method: 'PUT', body: request.body })
          return new Response(null, { status: resp.status, headers: cors })
        } catch (e) {
          return new Response(JSON.stringify({ msg: `Upload to OSS failed: ${e.message}` }), {
            status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
          })
        }
      }

      const mineruPath = path.replace(/^.*?\/api\/mineru\//, '/')
      const mineruUrl = 'https://mineru.net' + mineruPath

      const body = request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.text()
        : undefined

      const resp = await fetch(mineruUrl, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.MINERU_TOKEN}`,
        },
        body,
      })

      const ct = resp.headers.get('Content-Type') || 'application/json'
      return new Response(resp.body, { status: resp.status, headers: { ...cors, 'Content-Type': ct } })
    } catch (e) {
      return new Response(JSON.stringify({ msg: e.message }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
  },
}
