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
