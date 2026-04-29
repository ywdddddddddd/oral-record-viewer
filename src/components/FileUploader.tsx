import { useState, useRef, useCallback } from 'react'
import type { UploadedFile } from '../types'
import { ocrFile, isSupportedFile } from '../services/ocr'

interface Props {
  files: UploadedFile[]
  onFilesChange: React.Dispatch<React.SetStateAction<UploadedFile[]>>
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export default function FileUploader({ files, onFilesChange }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!isSupportedFile(file)) return

    if (file.size > 200 * 1024 * 1024) {
      const newFile: UploadedFile = {
        id: genId(),
        file,
        type: file.type === 'application/pdf' ? 'pdf' : 'image',
        previewUrl: '',
        ocrText: '文件超过 200MB，MinerU API 限制',
        ocrStatus: 'error',
        ocrProgress: 0,
      }
      onFilesChange((prev) => [...prev, newFile])
      return
    }

    const id = genId()
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')
    const isImg = file.type.startsWith('image/')

    let previewUrl = ''
    if (isImg) {
      previewUrl = URL.createObjectURL(file)
    }

    const newFile: UploadedFile = {
      id,
      file,
      type: isPdf ? 'pdf' : 'image',
      previewUrl,
      ocrText: '',
      ocrStatus: 'processing',
      ocrProgress: 5,
    }

    onFilesChange((prev) => [...prev, newFile])

    try {
      const text = await ocrFile(file, (msg, pct) => {
        onFilesChange((prev) =>
          prev.map((f) =>
            f.id === id
              ? { ...f, ocrStatus: 'processing' as const, ocrProgress: pct, ocrText: msg }
              : f
          )
        )
      })

      onFilesChange((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, ocrText: text, ocrStatus: 'done' as const, ocrProgress: 100 }
            : f
        )
      )
    } catch (e) {
      onFilesChange((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                ocrText: e instanceof Error ? e.message : '识别失败',
                ocrStatus: 'error' as const,
                ocrProgress: 0,
              }
            : f
        )
      )
    }
  }, [onFilesChange])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    for (const file of Array.from(e.dataTransfer.files)) {
      processFile(file)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files
    if (selected) {
      for (const file of Array.from(selected)) {
        processFile(file)
      }
    }
    e.target.value = ''
  }

  function removeFile(id: string) {
    const f = files.find((x) => x.id === id)
    if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl)
    onFilesChange(files.filter((x) => x.id !== id))
  }

  const allDone = files.length > 0 && files.every((f) => f.ocrStatus === 'done')
  const combinedText = files
    .filter((f) => f.ocrStatus === 'done')
    .map((f) => f.ocrText)
    .join('\n---\n')

  const FILE_ICON: Record<string, string> = {
    pdf: '📄',
    image: '🖼️',
  }

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
          ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-300 hover:bg-slate-50'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
          multiple
          onChange={handleFileSelect}
        />
        <div className="text-3xl mb-2">📁</div>
        <p className="text-sm font-medium text-slate-600">
          {dragOver ? '松开以上传文件' : '拖放文件到此处，或点击上传'}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          支持 PDF、图片（PNG/JPG）、Word、PPT — MinerU 精准解析
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 grid gap-3">
          {files.map((f) => (
            <div
              key={f.id}
              className="border border-slate-200 rounded-xl p-3 flex gap-3 bg-white"
            >
              <div className="w-20 h-28 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                {f.previewUrl ? (
                  <img
                    src={f.previewUrl}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">{FILE_ICON[f.type] ?? '📎'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-700 truncate">{f.file.name}</p>
                  <button
                    onClick={() => removeFile(f.id)}
                    className="text-slate-300 hover:text-red-500 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  {(f.file.size / 1024).toFixed(0)} KB
                </p>
                <div className="flex items-center gap-2 min-w-0">
                  {f.ocrStatus === 'processing' && (
                    <>
                      <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden max-w-[120px]">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${f.ocrProgress}%` }}
                        />
                      </div>
                      <span className="text-xs text-blue-500 truncate">
                        {f.ocrText || '识别中…'}
                      </span>
                    </>
                  )}
                  {f.ocrStatus === 'done' && (
                    <span className="text-xs text-green-600 font-medium">
                      ✓ 已识别 {f.ocrText.length} 字
                    </span>
                  )}
                  {f.ocrStatus === 'error' && (
                    <span className="text-xs text-red-500 truncate">{f.ocrText || '识别失败'}</span>
                  )}
                </div>
                {f.ocrStatus === 'done' && f.ocrText && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 whitespace-pre-line">
                    {f.ocrText.slice(0, 100)}…
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {allDone && (
        <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-white">
          <details>
            <summary className="text-sm font-medium text-slate-600 cursor-pointer">
              查看完整识别文字（{combinedText.length} 字）
            </summary>
            <pre className="mt-2 text-xs text-slate-600 whitespace-pre-wrap max-h-48 overflow-auto bg-slate-50 rounded-lg p-3">
              {combinedText}
            </pre>
          </details>
        </div>
      )}

      {allDone && (
        <div className="mt-3 text-xs text-slate-400">
          由 MinerU vlm 模型精准解析
        </div>
      )}
    </div>
  )
}
