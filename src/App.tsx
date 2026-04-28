import { useState, useEffect, useCallback } from 'react'
import DoctorPanel from './components/DoctorPanel'
import PatientFlowView from './components/PatientFlowView'

function getCaseIdFromURL(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('case')
}

export default function App() {
  const [patientCaseId, setPatientCaseId] = useState<string | null>(getCaseIdFromURL)

  const handleViewPatient = useCallback((caseId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?case=${caseId}`
    window.history.pushState({}, '', url)
    setPatientCaseId(caseId)
  }, [])

  const handleBack = useCallback(() => {
    window.history.pushState({}, '', window.location.pathname)
    setPatientCaseId(null)
  }, [])

  useEffect(() => {
    const handler = () => setPatientCaseId(getCaseIdFromURL())
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  if (patientCaseId) {
    return (
      <div className="min-h-screen bg-amber-50">
        <header className="bg-white border-b border-amber-100 py-3 px-4 shadow-sm">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <h1 className="text-base font-bold text-slate-700">
              🦷 口腔健康报告
            </h1>
            <button
              onClick={handleBack}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ← 返回
            </button>
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <PatientFlowView caseId={patientCaseId} onBack={handleBack} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 py-3 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs text-slate-300">医生工具</span>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <DoctorPanel onViewPatient={handleViewPatient} />
      </div>
    </div>
  )
}
