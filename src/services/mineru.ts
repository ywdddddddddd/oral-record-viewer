const WORKER_URL = 'https://oral-mineru-proxy.oral-mineru.workers.dev'
const MINERU_BASE = 'https://mineru.net'
const TOKEN = import.meta.env.VITE_MINERU_API_KEY
const CORS_PROXY = (url: string) => 'https://corsproxy.io/?' + encodeURIComponent(url)

function proxyBase(): string {
  if (import.meta.env.DEV) return window.location.pathname.replace(/\/$/, '') + '/api/mineru'
  if (window.location.hostname.includes('vercel.app')) return '/api/mineru'
  return WORKER_URL
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

async function mineruFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = MINERU_BASE + path
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, ...(init?.headers as Record<string, string>) }
  
  // Same-origin proxy (dev/vercel): no fallback needed
  if (import.meta.env.DEV || window.location.hostname.includes('vercel.app')) {
    return fetch(proxyBase() + path, init)
  }
  
  // GitHub Pages: try multiple paths
  const attempts = [
    () => fetch(url, { ...init, headers }),                      // 1. direct mineru.net
    () => fetch(CORS_PROXY(url), { ...init, headers }),          // 2. corsproxy.io
    () => fetch(WORKER_URL + path, { ...init, headers }),        // 3. Worker
  ]
  
  for (const attempt of attempts) {
    try {
      const resp = await attempt()
      if (resp.ok) return resp
    } catch {}
  }
  throw new Error('无法连接 MinerU 服务，请检查网络后重试')
}

interface UploadResponse {
  code: number; msg: string; data: { batch_id: string; file_urls: string[] }
}
interface BatchResult {
  code: number; msg: string
  data: { batch_id: string; extract_result: Array<{ file_name: string; state: string; full_zip_url?: string; err_msg?: string }> }
}

async function getUploadUrl(filename: string): Promise<{ batchId: string; uploadUrl: string }> {
  const res = await mineruFetch('/api/v4/file-urls/batch', {
    method: 'POST',
    body: JSON.stringify({ files: [{ name: filename, is_ocr: true }], model_version: 'vlm', language: 'ch' }),
  })
  const data: UploadResponse = await res.json()
  if (data.code !== 0) throw new Error(`MinerU: ${data.msg}`)
  return { batchId: data.data.batch_id, uploadUrl: data.data.file_urls[0] }
}

async function uploadToSignedUrl(ossUrl: string, file: File): Promise<void> {
  const timeoutMs = Math.min(120000, Math.max(30000, Math.ceil(file.size / 102400) * 1000))
  
  // 1. Direct OSS PUT (fast, may need CORS)
  try {
    const r = await fetchWithTimeout(ossUrl, { method: 'PUT', body: file }, timeoutMs)
    if (r.status === 200) return
  } catch {}

  // 2. Worker proxy
  const clone = file.slice(0, file.size, file.type)
  const base = proxyBase()
  const r = await fetchWithTimeout(base + '/upload', {
    method: 'POST', headers: { 'x-upload-url': ossUrl }, body: clone,
  }, timeoutMs)
  if (r.status !== 200) {
    const text = await r.text().catch(() => '')
    try { const j = JSON.parse(text); throw new Error(j.msg || `HTTP ${r.status}`) } catch {}
    throw new Error(`上传失败: HTTP ${r.status}`)
  }
}

async function downloadFile(url: string): Promise<Response> {
  // Try: direct → corsproxy → Worker proxy
  try { const r = await fetch(url); if (r.ok) return r } catch {}
  try { const r = await fetch(CORS_PROXY(url)); if (r.ok) return r } catch {}
  const base = proxyBase()
  return fetch(base + '/download', { headers: { 'x-download-url': url } })
}

async function pollBatchResult(batchId: string, onProgress?: (msg: string) => void): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const res = await mineruFetch(`/api/v4/extract-results/batch/${batchId}`)
    const data: BatchResult = await res.json()
    if (data.code !== 0) throw new Error(`MinerU: ${data.msg}`)
    const result = data.data.extract_result[0]
    if (!result) continue
    if (result.state === 'done' && result.full_zip_url) {
      onProgress?.('下载结果中…')
      const mdUrl = result.full_zip_url.replace('.zip', '/full.md')
      try {
        const mdResp = await downloadFile(mdUrl)
        const md = await mdResp.text()
        if (md && !md.startsWith('<?xml')) return md
      } catch { }
      const zipResp = await downloadFile(result.full_zip_url)
      const blob = await zipResp.blob()
      return await extractMdFromZip(blob)
    }
    if (result.state === 'failed') throw new Error(result.err_msg || 'MinerU 解析失败')
    onProgress?.(`解析中…(${result.state})`)
  }
  throw new Error('解析超时（3分钟），请重试')
}

async function extractMdFromZip(blob: Blob): Promise<string> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(blob)
  const mdFile = zip.file('full.md')
  if (mdFile) return await mdFile.async('string')
  for (const [name, file] of Object.entries(zip.files)) {
    if (name.endsWith('.md') && !file.dir) return await file.async('string')
  }
  throw new Error('ZIP 中未找到 Markdown 文件')
}

export async function parseWithMinerU(
  file: File,
  onProgress?: (msg: string, pct: number) => void
): Promise<string> {
  onProgress?.('获取上传链接…', 5)
  const { batchId, uploadUrl } = await getUploadUrl(file.name)
  onProgress?.('上传文件中…', 15)
  await uploadToSignedUrl(uploadUrl, file)
  onProgress?.('MinerU 解析中…', 30)
  const text = await pollBatchResult(batchId, (msg) => onProgress?.(msg, 60))
  onProgress?.('解析完成', 100)
  return text
}
