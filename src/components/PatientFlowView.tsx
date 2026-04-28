import { useState, useEffect, useCallback } from 'react'
import type { StoredCase, Question } from '../types'
import { getCaseById, saveCase } from '../data/store'
import PatientReport from './PatientReport'
import PatientSurvey from './PatientSurvey'
import ClosedLoop from './ClosedLoop'
import { createInitialLoopState } from '../services/loop'

interface Props {
  caseId: string
  onBack: () => void
}

type PatientStep = 'loading' | 'not-found' | 'report' | 'survey' | 'done'

export default function PatientFlowView({ caseId, onBack }: Props) {
  const [step, setStep] = useState<PatientStep>('loading')
  const [caseData, setCaseData] = useState<StoredCase | null>(null)
  const [allCorrect, setAllCorrect] = useState(false)

  const loadCase = useCallback(() => {
    const c = getCaseById(caseId)
    if (!c) {
      setStep('not-found')
      return
    }
    setCaseData(c)

    if (c.status === 'completed' && c.patientAnswers) {
      setAllCorrect(true)
      setStep('done')
    } else {
      setStep('report')
    }
  }, [caseId])

  useEffect(() => {
    loadCase()
  }, [loadCase])

  function handleMarkSections(markedIds: string[]) {
    // For future re-explain feature
    void markedIds
  }

  function handleStartSurvey() {
    setStep('survey')
    if (caseData && caseData.status === 'ready') {
      saveCase({ ...caseData, status: 'sent' })
    }
  }

  function handleSurveyComplete(answers: number[], questions: Question[]) {
    if (!caseData) return
    const allCorrect = questions.every((q, i) => answers[i] === q.correctIndex)

    if (allCorrect) {
      setAllCorrect(true)
      setStep('done')
      saveCase({
        ...caseData,
        status: 'completed',
        completedAt: Date.now(),
        patientAnswers: answers,
      })
    }
  }

  const emptyLoop = createInitialLoopState()

  if (step === 'loading') {
    return (
      <div className="text-center py-20">
        <div className="animate-pulse text-3xl mb-4">🦷</div>
        <p className="text-slate-500">加载中…</p>
      </div>
    )
  }

  if (step === 'not-found' || !caseData) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">未找到该病例</h2>
        <p className="text-sm text-slate-500 mb-6">该病例可能已被删除或链接无效</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm cursor-pointer"
        >
          返回
        </button>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-green-600 mb-2">确认完成，感谢配合</h2>
          <p className="text-sm text-slate-500 mb-2">
            您已阅读并理解了 {caseData.title}
          </p>
          <p className="text-xs text-slate-400">
            您的医生已收到确认通知
          </p>
        </div>
        <ClosedLoop
          loopState={{ ...emptyLoop, status: 'completed', isClosed: true }}
          attemptCount={1}
          allPassed={allCorrect}
          onReset={loadCase}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{caseData.title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">您的口腔健康报告 — 请仔细阅读后完成确认</p>
        </div>
        {step === 'report' && (
          <button
            onClick={handleStartSurvey}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 cursor-pointer transition-all"
          >
            已理解，去确认
          </button>
        )}
      </div>

      {step === 'report' && (
        <PatientReport
          sections={caseData.plainSections}
          onMarkedSectionsChange={handleMarkSections}
          showMarkMode={false}
          onConfirm={handleStartSurvey}
        />
      )}

      {step === 'survey' && (
        <PatientSurvey
          questions={caseData.questions}
          questionsLoading={false}
          onReloadQuestions={() => setStep('report')}
          onAllPassed={() => {}}
          onComplete={(answers) => handleSurveyComplete(answers, caseData.questions)}
        />
      )}
    </div>
  )
}
