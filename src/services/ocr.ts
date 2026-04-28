import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

export async function ocrImage(file: File): Promise<string> {
  const worker = await Tesseract.createWorker('chi_sim+eng')
  try {
    const imgUrl = URL.createObjectURL(file)
    const {
      data: { text },
    } = await worker.recognize(imgUrl)
    URL.revokeObjectURL(imgUrl)
    return text.trim()
  } finally {
    await worker.terminate()
  }
}

export async function ocrPdf(file: File): Promise<string> {
  const arrayBuf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise
  const texts: string[] = []

  for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    texts.push(pageText)
  }

  const combined = texts.join('\n').trim()

  if (combined.length < 100) {
    return await ocrPdfAsImage(file, pdf)
  }

  return combined
}

async function ocrPdfAsImage(_file: File, pdf: pdfjsLib.PDFDocumentProxy): Promise<string> {
  const worker = await Tesseract.createWorker('chi_sim+eng')
  try {
    const allText: string[] = []

    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 2 })

      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!

      await page.render({ canvasContext: ctx, viewport, canvas }).promise

      const imgData = canvas.toDataURL('image/png')
      const {
        data: { text },
      } = await worker.recognize(imgData)
      allText.push(text.trim())
    }

    return allText.join('\n')
  } finally {
    await worker.terminate()
  }
}

export async function extractPdfPreviewImage(file: File): Promise<string> {
  const arrayBuf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1.5 })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!

  await page.render({ canvasContext: ctx, viewport, canvas }).promise
  return canvas.toDataURL('image/png')
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.endsWith('.pdf')
}
