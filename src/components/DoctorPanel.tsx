import { useState } from 'react'
import type { CaseRecord, StoredCase, CaseStatus } from '../types'
import { getCases, saveCase, getCaseById, deleteCase } from '../data/store'
import { translateFreeText } from '../services/translate'
import { generateQuestions } from '../services/survey'
import CaseInput from './CaseInput'
import CaseList from './CaseList'
import { cases as presetCases } from '../data/cases'

interface Props {
  onViewPatient: (caseId: string) => void
}

export default function DoctorPanel({ onViewPatient }: Props) {
  const [caseList, setCaseList] = useState<StoredCase[]>(() => getCases())
  const [showInput, setShowInput] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function refreshList() {
    setCaseList(getCases())
  }

  async function handleCreate(title: string, content: string) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const newCase: StoredCase = {
      id,
      title: title || '未命名病例',
      originalContent: content,
      plainSections: [],
      questions: [],
      status: 'processing',
      createdAt: Date.now(),
      completedAt: null,
      patientAnswers: null,
    }
    saveCase(newCase)
    setShowInput(false)
    setProcessingId(id)
    setError(null)
    refreshList()

    try {
      const { title: aiTitle, sections } = await translateFreeText(content)
      const qs = await generateQuestions(sections)
      updateCase(id, {
        title: aiTitle || title || '口腔健康报告',
        plainSections: sections,
        questions: qs,
        status: 'ready',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 处理失败')
      updateCase(id, { status: 'ready' })
    }
  }

  async function handleUsePreset(preset: CaseRecord) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const fullText = preset.sections
      .map((s) => `【${s.title}】\n${s.content}`)
      .join('\n\n')

    const newCase: StoredCase = {
      id,
      title: preset.title,
      originalContent: fullText,
      plainSections: [],
      questions: [],
      status: 'processing',
      createdAt: Date.now(),
      completedAt: null,
      patientAnswers: null,
    }
    saveCase(newCase)
    setProcessingId(id)
    setError(null)
    refreshList()

    try {
      const { sections } = await translateFreeText(fullText)
      const qs = await generateQuestions(sections)
      updateCase(id, {
        plainSections: sections,
        questions: qs,
        status: 'ready',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 处理失败')
      updateCase(id, { status: 'ready' })
    }
  }

  function updateCase(id: string, patch: Partial<StoredCase>) {
    const existing = getCaseById(id)
    if (existing) {
      saveCase({ ...existing, ...patch })
    }
    setProcessingId(null)
    refreshList()
  }

  function handleDelete(id: string) {
    deleteCase(id)
    refreshList()
  }

  function handleResetStatus(id: string) {
    const c = getCaseById(id)
    if (c) {
      saveCase({
        ...c,
        status: 'ready',
        completedAt: null,
        patientAnswers: null,
      })
      refreshList()
    }
  }

  const STATUS_MAP: Record<CaseStatus, { label: string; cls: string }> = {
    processing: { label: '处理中', cls: 'bg-blue-100 text-blue-700' },
    ready: { label: '待分享', cls: 'bg-yellow-100 text-yellow-700' },
    sent: { label: '已发送', cls: 'bg-purple-100 text-purple-700' },
    completed: { label: '已闭环', cls: 'bg-green-100 text-green-700' },
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🦷</span>
        <div>
          <h1 className="text-lg font-bold text-slate-800">口腔病历通俗化工具</h1>
          <p className="text-xs text-slate-400">专业病历 → AI通俗化 → 患者确认 → 闭环追踪</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          {error}
          <button className="ml-2 underline cursor-pointer" onClick={() => setError(null)}>关闭</button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6 mt-4">
        <button
          onClick={() => setShowInput(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 cursor-pointer transition-all"
        >
          + 新建病例
        </button>
        <div className="text-xs text-slate-400">
          或从模板快速开始：
        </div>
        <div className="flex gap-1">
          {presetCases.map((p) => (
            <button
              key={p.id}
              onClick={() => handleUsePreset(p)}
              disabled={processingId !== null}
              className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md text-xs hover:bg-slate-200 cursor-pointer transition-all disabled:opacity-50"
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>

      {processingId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <span className="animate-pulse text-lg">🤖</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-700">AI 正在处理病例…</p>
            <p className="text-xs text-blue-500">将专业术语转为通俗报告并生成理解问卷</p>
          </div>
        </div>
      )}

      <CaseList
        cases={caseList}
        statusMap={STATUS_MAP}
        onViewPatient={onViewPatient}
        onDelete={handleDelete}
        onReset={handleResetStatus}
      />

      {showInput && (
        <CaseInput
          onClose={() => setShowInput(false)}
          onSubmit={handleCreate}
          loading={processingId !== null}
        />
      )}
    </div>
  )
}
