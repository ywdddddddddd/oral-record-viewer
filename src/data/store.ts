import type { StoredCase } from '../types'

const STORAGE_KEY = 'oral-record-cases'

export function getCases(): StoredCase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getCaseById(id: string): StoredCase | null {
  return getCases().find((c) => c.id === id) ?? null
}

export function saveCase(c: StoredCase): void {
  const cases = getCases()
  const idx = cases.findIndex((x) => x.id === c.id)
  if (idx >= 0) cases[idx] = c
  else cases.unshift(c)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases))
}

export function updateCase(id: string, patch: Partial<StoredCase>): void {
  const c = getCaseById(id)
  if (!c) return
  saveCase({ ...c, ...patch })
}

export function deleteCase(id: string): void {
  const cases = getCases().filter((c) => c.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases))
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
