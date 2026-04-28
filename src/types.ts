export interface CaseSection {
  title: string
  content: string
}

export interface CaseRecord {
  id: string
  title: string
  description: string
  sections: CaseSection[]
}

export interface PlainSection {
  id: string
  title: string
  plainContent: string
  originalContent: string
  isMarked: boolean
  reExplanation?: string
}

export interface Question {
  id: string
  text: string
  options: string[]
  correctIndex: number
  relatedSectionId: string
  userAnswer: number | null
  isCorrect: boolean | null
}

export type StepNumber = 1 | 2 | 3 | 4 | 5

export type NotificationStatus =
  | 'idle'
  | 'sending'
  | 'sent'
  | 'viewed'
  | 'surveying'
  | 'completed'

export interface LoopState {
  status: NotificationStatus
  attemptCount: number
  maxAttempts: number
  isClosed: boolean
}

export type CaseStatus = 'processing' | 'ready' | 'sent' | 'completed'

export interface StoredCase {
  id: string
  title: string
  originalContent: string
  plainSections: PlainSection[]
  questions: Question[]
  status: CaseStatus
  createdAt: number
  completedAt: number | null
  patientAnswers: number[] | null
}

export type DoctorMode = 'education' | 'analysis'

export interface AnalysisResult {
  completeness: {
    score: number
    missing: string[]
    issues: string[]
  }
  compliance: {
    score: number
    issues: string[]
  }
  riskAssessment: {
    hasAllergyRecord: boolean
    hasSystemicDisease: boolean
    warnings: string[]
  }
  followupScript: string
  summary: string
}

export interface UploadedFile {
  id: string
  file: File
  type: 'image' | 'pdf'
  previewUrl: string
  ocrText: string
  ocrStatus: 'pending' | 'processing' | 'done' | 'error'
  ocrProgress: number
}
