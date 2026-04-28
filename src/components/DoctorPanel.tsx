import { useState } from 'react'
import type { CaseRecord, StoredCase, CaseStatus, DoctorMode, UploadedFile, AnalysisResult } from '../types'
import { getCases, saveCase, getCaseById, deleteCase } from '../data/store'
import { translateFreeText } from '../services/translate'
import { generateQuestions } from '../services/survey'
import { analyzeCase } from '../services/analyzer'
import CaseInput from './CaseInput'
import CaseList from './CaseList'
import FileUploader from './FileUploader'
import AnalysisView from './AnalysisView'
import { cases as presetCases } from '../data/cases'

interface Props {
  onViewPatient: (caseId: string) => void
}

export default function DoctorPanel({ onViewPatient }: Props) {
  const [mode, setMode] = useState<DoctorMode>('education')

  const [caseList, setCaseList] = useState<StoredCase[]>(() => getCases())
  const [showInput, setShowInput] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [pastedText, setPastedText] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

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
    const fullText = preset.sections.map((s) => `【${s.title}】\n${s.content}`).join('\n\n')
    const newCase: StoredCase = {
      id, title: preset.title, originalContent: fullText,
      plainSections: [], questions: [], status: 'processing',
      createdAt: Date.now(), completedAt: null, patientAnswers: null,
    }
    saveCase(newCase)
    setProcessingId(id)
    setError(null)
    refreshList()

    try {
      const { sections } = await translateFreeText(fullText)
      const qs = await generateQuestions(sections)
      updateCase(id, { plainSections: sections, questions: qs, status: 'ready' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 处理失败')
      updateCase(id, { status: 'ready' })
    }
  }

  function updateCase(id: string, patch: Partial<StoredCase>) {
    const existing = getCaseById(id)
    if (existing) saveCase({ ...existing, ...patch })
    setProcessingId(null)
    refreshList()
  }

  function handleDelete(id: string) { deleteCase(id); refreshList() }

  function handleResetStatus(id: string) {
    const c = getCaseById(id)
    if (c) { saveCase({ ...c, status: 'ready', completedAt: null, patientAnswers: null }); refreshList() }
  }

  async function handleAnalyze() {
    const ocrText = files.filter((f) => f.ocrStatus === 'done').map((f) => f.ocrText).join('\n---\n')
    const text = ocrText || pastedText
    if (!text.trim()) return

    setAnalyzing(true)
    try {
      const result = await analyzeCase(text)
      setAnalysisResult(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失败')
    } finally {
      setAnalyzing(false)
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦷</span>
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              口腔病历工具
            </h1>
            <p className="text-xs text-slate-400">
              {mode === 'education' ? 'AI通俗化 → 患者确认 → 闭环追踪' : '合规审查 → 完整性分析 → 复诊话术'}
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode('education')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              mode === 'education' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            通俗化解释
          </button>
          <button
            onClick={() => setMode('analysis')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              mode === 'analysis' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            病例/处方分析
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          {error}
          <button className="ml-2 underline cursor-pointer" onClick={() => setError(null)}>关闭</button>
        </div>
      )}

      {mode === 'education' && (
        <>
          <div className="flex items-center gap-3 mb-6 mt-4">
            <button
              onClick={() => setShowInput(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 cursor-pointer transition-all"
            >
              + 新建病例
            </button>
            <div className="text-xs text-slate-400">或从模板快速开始：</div>
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
        </>
      )}

      {mode === 'analysis' && (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            💡 上传病历或处方（PDF / 图片），AI 将进行合规性审查并生成复诊话术建议。
            不上传文件时可直接粘贴文字分析。
          </div>

          <FileUploader files={files} onFilesChange={setFiles} />

          <details className="border border-slate-200 rounded-xl bg-white">
            <summary className="px-4 py-3 text-sm font-medium text-slate-600 cursor-pointer hover:text-slate-800">
              或直接粘贴文字（不上传文件）
            </summary>
            <div className="px-4 pb-4">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="粘贴病历全文…"
                rows={8}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-purple-500"
              />
            </div>
          </details>

          <div className="flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={
                analyzing ||
                (files.filter((f) => f.ocrStatus === 'done').length === 0 && !pastedText.trim())
              }
              className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              {analyzing ? '分析中…' : 'AI 合规分析'}
            </button>
          </div>

          {(analysisResult || analyzing) && (
            <AnalysisView
              result={analysisResult}
              loading={analyzing}
              files={files}
              onClose={() => setAnalysisResult(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}
