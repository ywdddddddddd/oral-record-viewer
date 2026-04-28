import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const M_TOKEN =
  'eyJ0eXBlIjoiSldUIiwiYWxnIjoiSFM1MTIifQ.eyJqdGkiOiI0MzIwOTc5OSIsInJvbCI6IlJPTEVfUkVHSVNURVIiLCJpc3MiOiJPcGVuWExhYiIsImlhdCI6MTc3Mzg1Nzg1NywiY2xpZW50SWQiOiJsa3pkeDU3bnZ5MjJqa3BxOXgydyIsInBob25lIjoiIiwib3BlbklkIjpudWxsLCJ1dWlkIjoiZWU3NTI1MjUtOGY3Zi00M2MyLWIyZmItMDYyMDQ1Y2Q3MDQwIiwiZW1haWwiOiIiLCJleHAiOjE3ODE2MzM4NTd9.k3_8IeqnZN6EL62RV79qlSOCqUFUNiun6UoDmACjDrddet1pgsqZFR_z8Lba8GsjHF9hTLnT9fYhGeZHhtVSlA'

export default defineConfig({
  base: '/oral-record-viewer/',
  plugins: [
    {
      name: 'mineru-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url ?? ''
          
          if (url.includes('/api/mineru/download')) {
            const targetUrl = req.headers['x-download-url'] as string
            if (!targetUrl) {
              res.statusCode = 400
              res.end(JSON.stringify({ code: -1, msg: 'missing x-download-url header' }))
              return
            }
            try {
              const up = await fetch(targetUrl)
              res.statusCode = up.status
              if (up.ok) {
                const buf = Buffer.from(await up.arrayBuffer())
                res.end(buf)
              } else {
                res.end()
              }
            } catch {
              res.statusCode = 502
              res.end()
            }
            return
          }

          if (url.includes('/api/mineru/upload')) {
            const targetUrl = req.headers['x-upload-url'] as string
            if (!targetUrl) {
              res.statusCode = 400
              res.end(JSON.stringify({ code: -1, msg: 'missing x-upload-url header' }))
              return
            }
            try {
              const body = await readRawBody(req)
              console.log('[mineru-proxy] upload:', body.length, 'bytes ->', targetUrl.slice(0, 80))
              const up = await fetch(targetUrl, { method: 'PUT', body })
              console.log('[mineru-proxy] upload response:', up.status)
              res.statusCode = up.status
              res.end()
            } catch (e: unknown) {
              res.statusCode = 502
              res.end(JSON.stringify({ code: -1, msg: String(e) }))
            }
            return
          }

          if (!url.includes('/api/mineru/')) return next()
          const path = url.replace(/^.*?\/api\/mineru\//, '/')
          const target = 'https://mineru.net' + path
          console.log('[mineru-proxy]', req.method, url, '->', target)
          try {
            const body = await readBody(req)
            const up = await fetch(target, {
              method: req.method,
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${M_TOKEN}`,
              },
              body: body || undefined,
            })
            console.log('[mineru-proxy] response:', up.status)
            res.statusCode = up.status
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(await up.text())
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ code: -1, msg }))
          }
        })
      },
    },
    react(),
    tailwindcss(),
  ],
})

function readBody(req: any): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk: string) => (data += chunk))
    req.on('end', () => resolve(data))
  })
}

function readRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
  })
}
