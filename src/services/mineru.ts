const WORKER_URL = 'https://oral-mineru-proxy.oral-mineru.workers.dev'
const MINERU_BASE = 'https://mineru.net'
const TOKEN = import.meta.env.VITE_MINERU_API_KEY

function baseUrl(): string {
  if (import.meta.env.DEV) return window.location.pathname.replace(/\/$/, '') + '/api/mineru'
  return MINERU_BASE
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

async function mineruFetch(path: string, init?: RequestInit): Promise<Response> {
  if (import.meta.env.DEV) {
    const url = baseUrl() + path
    return fetch(url, init)
  }
  // Production: try direct with token, fallback to Worker
  const url = MINERU_BASE + path
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
    ...(init?.headers as Record<string, string>),
  }
  try {
    const direct = await fetch(url, { ...init, headers })
    if (direct.ok) return direct
  } catch { /* fall through to Worker */ }
  return fetch(WORKER_URL + path, { ...init, headers })
}

interface UploadResponse {
  code: number; msg: string; data: { batch_id: string; file_urls: string[] }
}

interface BatchResult {
  code: number; msg: string
  data: {
    batch_id: string
    extract_result: Array<{ file_name: string; state: string; full_zip_url?: string; err_msg?: string }>
  }
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
  if (import.meta.env.DEV) {
    const res = await fetch(baseUrl() + '/upload', {
      method: 'POST', headers: { 'x-upload-url': ossUrl }, body: file,
    })
    if (res.status !== 200) throw new Error(`上传失败: HTTP ${res.status}`)
    return
  }

  const timeoutMs = Math.min(300000, Math.max(30000, Math.ceil(file.size / 102400) * 1000))
  
  // Try direct OSS PUT first (fast in China, OSS may support CORS)
  try {
    const direct = await fetchWithTimeout(ossUrl, { method: 'PUT', body: file }, timeoutMs)
    if (direct.status === 200) return
  } catch { /* fall through to Worker */ }

  // Worker fallback with cloned body
  const clone = file.slice(0, file.size, file.type)
  const res = await fetchWithTimeout(WORKER_URL + '/upload', {
    method: 'POST', headers: { 'x-upload-url': ossUrl }, body: clone,
  }, timeoutMs)
  if (res.status !== 200) {
    const text = await res.text().catch(() => '')
    if (text) {
      try { const j = JSON.parse(text); throw new Error(j.msg || text.slice(0, 200)) } catch {}
    }
    throw new Error(`上传失败: HTTP ${res.status}`)
  }
}

async function downloadOrProxy(url: string): Promise<Response> {
  try {
    const direct = await fetch(url)
    if (direct.ok) return direct
  } catch { }
  const res = await fetch(WORKER_URL + '/download', { headers: { 'x-download-url': url } })
  if (!res.ok) throw new Error(`下载失败: HTTP ${res.status}`)
  return res
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
        const mdResp = await downloadOrProxy(mdUrl)
        const md = await mdResp.text()
        if (md && !md.startsWith('<?xml')) return md
      } catch { }
      const zipResp = await downloadOrProxy(result.full_zip_url)
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
