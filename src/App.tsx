import { useState, useCallback, useEffect, useRef } from 'react'
import type { CaseRecord, PlainSection, Question, StepNumber, LoopState } from './types'
import { cases } from './data/cases'
import { translateRecord } from './services/translate'
import { generateQuestions } from './services/survey'
import { createInitialLoopState } from './services/loop'
import CaseSelect from './components/CaseSelect'
import AiTranslate from './components/AiTranslate'
import PatientReport from './components/PatientReport'
import PatientSurvey from './components/PatientSurvey'
import ClosedLoop from './components/ClosedLoop'

const STEP_LABELS = ['选择病例', 'AI 翻译', '通俗报告', '确认问卷', '闭环看板']

export default function App() {
  const [step, setStep] = useState<StepNumber>(1)
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null)

  const [plainSections, setPlainSections] = useState<PlainSection[]>([])
  const [questions, setQuestions] = useState<Question[]>([])

  const [loopState, setLoopState] = useState<LoopState>(createInitialLoopState())
  const [attemptCount, setAttemptCount] = useState(0)

  const [isTranslating, setIsTranslating] = useState(false)
  const [translateProgress, setTranslateProgress] = useState(0)
  const [translateError, setTranslateError] = useState<string | null>(null)
  const [questionsLoading, setQuestionsLoading] = useState(false)

  const [allSurveyPassed, setAllSurveyPassed] = useState(false)
  const [showMarkMode, setShowMarkMode] = useState(false)
  const [, setMarkedSectionIds] = useState<string[]>([])

  const translateTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const simulateProgress = useCallback(() => {
    translateTimer.current = setInterval(() => {
      setTranslateProgress((prev) => {
        if (prev >= 90) {
          clearInterval(translateTimer.current ?? undefined)
          return 90
        }
        const inc = prev < 30 ? 8 : prev < 60 ? 5 : 3
        return Math.min(90, prev + inc)
      })
    }, 500)
  }, [])

  const doTranslateAndAdvance = useCallback(async (record: CaseRecord) => {
    setSelectedCase(record)
    setStep(2)
    setIsTranslating(true)
    setTranslateProgress(0)
    setTranslateError(null)
    setLoopState({
      status: 'sending',
      attemptCount: attemptCount + 1,
      maxAttempts: 3,
      isClosed: false,
    })

    simulateProgress()

    try {
      const sections = await translateRecord(record)
      clearInterval(translateTimer.current ?? undefined)
      setTranslateProgress(100)
      setPlainSections(sections)
      setIsTranslating(false)
      setLoopState((prev) => ({ ...prev, status: 'sent' }))

      await new Promise((r) => setTimeout(r, 1200))
      setStep(3)
      setLoopState((prev) => ({ ...prev, status: 'viewed' }))
    } catch (e) {
      clearInterval(translateTimer.current ?? undefined)
      setIsTranslating(false)
      setTranslateError(e instanceof Error ? e.message : '未知错误')
    }
  }, [attemptCount, simulateProgress])

  const handleConfirmReport = useCallback(async () => {
    setStep(4)
    setQuestionsLoading(true)
    setLoopState((prev) => ({ ...prev, status: 'surveying' }))
    setAttemptCount((p) => p + 1)

    try {
      const qs = await generateQuestions(plainSections)
      setQuestions(qs)
    } catch {
      setQuestions([])
    } finally {
      setQuestionsLoading(false)
    }
  }, [plainSections])

  const handleReloadQuestions = useCallback(async () => {
    setQuestionsLoading(true)
    setShowMarkMode(false)
    setAttemptCount((p) => p + 1)

    try {
      const qs = await generateQuestions(plainSections)
      setQuestions(qs)
    } catch {
      setQuestions([])
    } finally {
      setQuestionsLoading(false)
    }
  }, [plainSections])

  const handleGoToStep5 = useCallback(() => {
    setStep(5)
    setAllSurveyPassed(true)
    setLoopState((prev) => ({
      ...prev,
      status: 'completed',
      isClosed: true,
    }))
  }, [])

  const handleReset = useCallback(() => {
    setStep(1)
    setSelectedCase(null)
    setPlainSections([])
    setQuestions([])
    setLoopState(createInitialLoopState())
    setAttemptCount(0)
    setAllSurveyPassed(false)
    setShowMarkMode(false)
    setIsTranslating(false)
    setTranslateProgress(0)
    setTranslateError(null)
    setQuestionsLoading(false)
  }, [])

  useEffect(() => {
    return () => clearInterval(translateTimer.current ?? undefined)
  }, [])

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200 py-4 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-bold text-slate-800">
            🦷 口腔病历通俗化报告
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            专业病历 → AI 通俗化 → 患者确认 → 通知闭环
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {STEP_LABELS.map((label, i) => {
            const isActive = step === i + 1
            const isDone = step > i + 1
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${isActive
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : isDone
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isActive ? 'text-blue-700' : isDone ? 'text-green-600' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
                {i < STEP_LABELS.length - 1 && (
                  <div
                    className={`w-6 h-0.5 ${isDone ? 'bg-green-400' : 'bg-slate-300'}`}
                  />
                )}
              </div>
            )
          })}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          {step === 1 && (
            <CaseSelect
              cases={cases}
              selectedId={selectedCase?.id ?? null}
              onSelect={(record) => {
                setSelectedCase(record)
                setStep(1)
              }}
              onNext={() => {
                if (selectedCase) {
                  doTranslateAndAdvance(selectedCase)
                }
              }}
            />
          )}

          {step === 2 && (
            <AiTranslate
              isTranslating={isTranslating}
              progress={translateProgress}
              error={translateError}
            />
          )}

          {step === 3 && (
            <PatientReport
              sections={plainSections}
              onMarkedSectionsChange={setMarkedSectionIds}
              showMarkMode={showMarkMode}
              onConfirm={() => {
                if (showMarkMode) {
                  setShowMarkMode(false)
                  handleReloadQuestions()
                } else {
                  handleConfirmReport()
                }
              }}
            />
          )}

          {step === 4 && (
            <PatientSurvey
              questions={questions}
              questionsLoading={questionsLoading}
              onReloadQuestions={() => {
                setShowMarkMode(true)
                setStep(3)
              }}
              onAllPassed={handleGoToStep5}
            />
          )}

          {step === 5 && (
            <ClosedLoop
              loopState={loopState}
              attemptCount={attemptCount}
              allPassed={allSurveyPassed}
              onReset={handleReset}
            />
          )}
        </div>

        <div className="text-center text-xs text-slate-300 mt-6">
          powered by DeepSeek v4-flash · 仅供演示
        </div>
      </div>
    </div>
  )
}
