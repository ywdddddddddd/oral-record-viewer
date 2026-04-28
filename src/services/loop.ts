import type { LoopState, NotificationStatus } from '../types'

export function createInitialLoopState(): LoopState {
  return {
    status: 'idle',
    attemptCount: 0,
    maxAttempts: 3,
    isClosed: false,
  }
}

export const STATUS_LABELS: Record<NotificationStatus, string> = {
  idle: '待发送',
  sending: '发送中',
  sent: '已发送',
  viewed: '已查看',
  surveying: '填写中',
  completed: '已完成',
}

export const STATUS_ORDER: NotificationStatus[] = [
  'idle',
  'sending',
  'sent',
  'viewed',
  'surveying',
  'completed',
]
