import { SCORE_THRESHOLD } from './scoring'
import type { Candidate, CandidateStatus } from './types'

const BASE_URL = 'https://app.flashsms.africa/api/v1'

function getHeaders() {
  const key = process.env.FLASHSMS_API_KEY
  if (!key) throw new Error('FLASHSMS_API_KEY is not set')
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

function getSenderId() {
  return process.env.FLASHSMS_SENDER_ID ?? 'FL OFFICE'
}

// Normalise a Ghana number to the format FlashSMS accepts (0XXXXXXXXX)
export function normaliseGhanaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('233') && digits.length === 12) return '0' + digits.slice(3)
  if (digits.startsWith('0') && digits.length === 10) return digits
  return digits
}

export function isValidGhanaPhone(raw: string): boolean {
  const normalised = normaliseGhanaPhone(raw)
  return /^0[235]\d{8}$/.test(normalised)
}

// ─── Core send ────────────────────────────────────────────────────────────────

interface SendResult {
  success: boolean
  messageId?: string
  recipientsSent?: number
  creditsUsed?: number
  error?: string
}

export async function sendSms(
  recipients: string[],
  message: string,
  campaignName?: string,
): Promise<SendResult> {
  try {
    const res = await fetch(`${BASE_URL}/sms/send`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        recipients: recipients.map(normaliseGhanaPhone),
        message,
        senderId: getSenderId(),
        ...(campaignName ? { campaignName } : {}),
      }),
    })
    let json: Record<string, unknown>
    try {
      json = await res.json()
    } catch {
      const text = await res.text().catch(() => '')
      return { success: false, error: `FlashSMS returned an unexpected response (HTTP ${res.status})${text ? `: ${text.slice(0, 200)}` : ''}` }
    }
    if (!json.success) return { success: false, error: (json.error as string | undefined) ?? `HTTP ${res.status}` }
    const data = json.data as Record<string, unknown>
    return {
      success: true,
      messageId: data?.messageId as string | undefined,
      recipientsSent: data?.recipientsSent as number | undefined,
      creditsUsed: data?.creditsUsed as number | undefined,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function sendSmsToGroup(
  groupId: string,
  message: string,
  campaignName?: string,
): Promise<SendResult> {
  try {
    const res = await fetch(`${BASE_URL}/sms/send`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        groupId,
        message,
        senderId: getSenderId(),
        ...(campaignName ? { campaignName } : {}),
      }),
    })
    let json: Record<string, unknown>
    try {
      json = await res.json()
    } catch {
      const text = await res.text().catch(() => '')
      return { success: false, error: `FlashSMS returned an unexpected response (HTTP ${res.status})${text ? `: ${text.slice(0, 200)}` : ''}` }
    }
    if (!json.success) return { success: false, error: (json.error as string | undefined) ?? `HTTP ${res.status}` }
    const data = json.data as Record<string, unknown>
    return {
      success: true,
      messageId: data?.messageId as string | undefined,
      recipientsSent: data?.recipientsSent as number | undefined,
      creditsUsed: data?.creditsUsed as number | undefined,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ─── Message templates ────────────────────────────────────────────────────────

function candidateDisplayName(c: Pick<Candidate, 'full_name' | 'surname'>): string {
  return `${c.full_name} ${c.surname}`.trim()
}

export function buildSubmissionMessage(
  c: Pick<Candidate, 'full_name' | 'surname' | 'total_score'>,
): string {
  const name = candidateDisplayName(c)
  return `Dear ${name}, your pastoral appointment score is ${c.total_score}. - First Love Church`
}

export function buildStatusChangeMessage(
  c: Pick<Candidate, 'full_name' | 'surname'>,
  newStatus: CandidateStatus,
): string | null {
  const name = candidateDisplayName(c)
  switch (newStatus) {
    case 'approved':
      return (
        `Dear ${name}, congratulations! Your pastoral appointment application has been APPROVED. ` +
        `Church leadership will be in contact with you regarding next steps.`
      )
    case 'rejected':
      // No SMS — rejection is communicated personally by admin/lead pastor
      return null
    case 'under_review':
      return (
        `Dear ${name}, your pastoral appointment application is now under review by church leadership. ` +
        `You will be contacted with a decision in due course.`
      )
    default:
      return null
  }
}

export function buildAdminAlertMessage(
  c: Pick<Candidate, 'full_name' | 'surname' | 'total_score' | 'is_disqualified'>,
  autoStatus: CandidateStatus,
): string {
  const name = candidateDisplayName(c)
  const flag = c.is_disqualified ? ' [FLAGGED]' : ''
  return (
    `FLC Appointments: New application from ${name}.${flag} ` +
    `Score: ${c.total_score}/1350. Auto-status: ${autoStatus.replace('_', ' ')}. ` +
    `Please review. `
  )
}
