const WORKER_URL = 'https://oral-mineru-proxy.oral-mineru.workers.dev'

function baseUrl(): string {
  if (import.meta.env.DEV) return window.location.pathname.replace(/\/$/, '') + '/api/mineru'
  return WORKER_URL
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

async function uploadToSignedUrl(url: string, file: File): Promise<void> {
  const timeoutMs = Math.min(300000, Math.max(30000, Math.ceil(file.size / 102400) * 1000))
  
  // Try direct PUT to OSS first (faster, no Worker hop)
  try {
    const direct = await fetchWithTimeout(url, { method: 'PUT', body: file }, timeoutMs)
    if (direct.status === 200) return
  } catch {
    // CORS or network error, fall through to Worker proxy
  }
  
  // Fallback: upload through Worker proxy
  const res = await fetchWithTimeout(baseUrl() + '/upload', {
    method: 'POST',
    headers: { 'x-upload-url': url },
    body: file,
  }, timeoutMs)
  if (res.status !== 200) {
    const text = await res.text().catch(() => '')
    if (text) {
      try { const j = JSON.parse(text); throw new Error(j.msg || text.slice(0, 200)) } catch {}
    }
    throw new Error(`上传失败: HTTP ${res.status}`)
  }
}

async function mineruFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    const url = `${baseUrl()}${path}`
    const headers = { ...(init?.headers as Record<string, string>) }
    console.log('[mineru] fetch:', url, init?.method ?? 'GET')
    const resp = await fetch(url, { ...init, headers })
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 200)}`)
    }
    return resp
  } catch (e) {
    console.error('[mineru] error:', e instanceof Error ? e.message : String(e))
    throw e
  }
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: [{ name: filename, is_ocr: true }], model_version: 'vlm', language: 'ch' }),
  })
  const data: UploadResponse = await res.json()
  if (data.code !== 0) throw new Error(`MinerU: ${data.msg}`)
  return { batchId: data.data.batch_id, uploadUrl: data.data.file_urls[0] }
}

async function proxyDownload(url: string): Promise<string> {
  const res = await fetch(baseUrl() + '/download', { headers: { 'x-download-url': url } })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`下载结果失败: HTTP ${res.status} ${err}`)
  }
  return res.text()
}

async function downloadMdFromZipUrl(zipUrl: string): Promise<string> {
  const res = await fetch(baseUrl() + '/download', { headers: { 'x-download-url': zipUrl } })
  if (!res.ok) throw new Error(`下载 ZIP 失败: HTTP ${res.status}`)
  const blob = await res.blob()
  return await extractMdFromZip(blob)
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
      // Try direct .md download first (via proxy in dev)
      const mdUrl = result.full_zip_url.replace('.zip', '/full.md')
      try {
        const md = await proxyDownload(mdUrl)
        if (md && !md.startsWith('<?xml')) return md
      } catch { /* fall through to ZIP */ }
      return await downloadMdFromZipUrl(result.full_zip_url)
    }
    if (result.state === 'failed') throw new Error(result.err_msg || 'MinerU 解析失败')
    onProgress?.(`解析中…（${result.state}）`)
  }
  throw new Error('MinerU 解析超时（3分钟），请重试')
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
