import { parseWithMinerU } from './mineru'

export async function ocrImage(file: File): Promise<string> {
  return parseWithMinerU(file)
}

export async function ocrPdf(file: File): Promise<string> {
  return parseWithMinerU(file)
}

export async function ocrFile(
  file: File,
  onProgress?: (msg: string, pct: number) => void
): Promise<string> {
  return parseWithMinerU(file, onProgress)
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.endsWith('.pdf')
}

export function isSupportedFile(file: File): boolean {
  return (
    isImageFile(file) ||
    isPdfFile(file) ||
    file.type === 'application/msword' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/vnd.ms-powerpoint' ||
    file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    file.name.endsWith('.doc') ||
    file.name.endsWith('.docx') ||
    file.name.endsWith('.ppt') ||
    file.name.endsWith('.pptx')
  )
}
