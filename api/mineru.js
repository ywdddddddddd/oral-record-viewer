export default async function handler(req, res) {
  const url = req.url
  if (url.includes('/upload') || url.includes('/download')) {
    const target = req.headers['x-upload-url'] || req.headers['x-download-url']
    if (!target) return res.status(400).json({ msg: 'missing target url' })
    try {
      const method = url.includes('/upload') ? 'PUT' : 'GET'
      const fetchResp = await fetch(target, {
        method,
        body: method === 'PUT' ? req : undefined,
      })
      res.status(fetchResp.status)
      if (method === 'GET') {
        const buf = Buffer.from(await fetchResp.arrayBuffer())
        res.setHeader('Content-Type', fetchResp.headers.get('Content-Type') || 'application/octet-stream')
        res.send(buf)
      } else {
        res.end()
      }
    } catch (e) {
      res.status(502).json({ msg: e.message })
    }
    return
  }

  const path = url.replace(/^.*?\/api\/mineru\/?/, '/')
  const mineruUrl = 'https://mineru.net' + path

  try {
    let body = undefined
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    }

    const fetchResp = await fetch(mineruUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MINERU_TOKEN}`,
      },
      body,
    })

    const data = await fetchResp.text()
    res.status(fetchResp.status).setHeader('Content-Type', 'application/json').send(data)
  } catch (e) {
    res.status(502).json({ msg: e.message })
  }
}
