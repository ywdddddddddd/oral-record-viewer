const BASE = 'https://mineru.net/api/v4'
const TOKEN = import.meta.env.VITE_MINERU_API_KEY

interface UploadResponse {
  code: number
  msg: string
  data: {
    batch_id: string
    file_urls: string[]
  }
}

interface BatchResult {
  code: number
  msg: string
  data: {
    batch_id: string
    extract_result: Array<{
      file_name: string
      state: string
      full_zip_url?: string
      err_msg?: string
    }>
  }
}

async function getUploadUrl(filename: string): Promise<{ batchId: string; uploadUrl: string }> {
  const res = await fetch(`${BASE}/file-urls/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      files: [{ name: filename, is_ocr: true }],
      model_version: 'vlm',
      language: 'ch',
    }),
  })
  const data: UploadResponse = await res.json()
  if (data.code !== 0) throw new Error(`MinerU: ${data.msg}`)
  return { batchId: data.data.batch_id, uploadUrl: data.data.file_urls[0] }
}

async function uploadToSignedUrl(url: string, file: File): Promise<void> {
  const res = await fetch(url, {
    method: 'PUT',
    body: file,
  })
  if (res.status !== 200) throw new Error(`Upload failed: HTTP ${res.status}`)
}

async function pollBatchResult(
  batchId: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000))

    const res = await fetch(`${BASE}/extract-results/batch/${batchId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    const data: BatchResult = await res.json()

    if (data.code !== 0) throw new Error(`MinerU: ${data.msg}`)

    const result = data.data.extract_result[0]
    if (!result) continue

    if (result.state === 'done' && result.full_zip_url) {
      onProgress?.('下载结果中…')
      const mdUrl = result.full_zip_url.replace('.zip', '/full.md')
      const mdRes = await fetch(mdUrl)
      if (mdRes.ok) return await mdRes.text()
      // Fallback: try to get from zip
      const zipRes = await fetch(result.full_zip_url)
      if (zipRes.ok) {
        const blob = await zipRes.blob()
        return await extractMdFromZip(blob)
      }
      throw new Error('无法下载解析结果')
    }

    if (result.state === 'failed') {
      throw new Error(result.err_msg || 'MinerU 解析失败')
    }

    onProgress?.(`解析中…（${result.state}）`)
  }
  throw new Error('MinerU 解析超时')
}

async function extractMdFromZip(blob: Blob): Promise<string> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(blob)
  const mdFile = zip.file('full.md')
  if (mdFile) return await mdFile.async('string')
  // Try any .md file
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
