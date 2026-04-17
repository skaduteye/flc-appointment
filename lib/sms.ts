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
  return process.env.FLASHSMS_SENDER_ID ?? 'FLChurch'
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
    const json = await res.json()
    if (!json.success) return { success: false, error: json.error }
    return {
      success: true,
      messageId: json.data.messageId,
      recipientsSent: json.data.recipientsSent,
      creditsUsed: json.data.creditsUsed,
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
    const json = await res.json()
    if (!json.success) return { success: false, error: json.error }
    return {
      success: true,
      messageId: json.data.messageId,
      recipientsSent: json.data.recipientsSent,
      creditsUsed: json.data.creditsUsed,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ─── Balance ──────────────────────────────────────────────────────────────────

export interface BalanceResult {
  success: boolean
  balance?: number
  accountName?: string
  error?: string
}

export async function getBalance(): Promise<BalanceResult> {
  try {
    const res = await fetch(`${BASE_URL}/balance`, { headers: getHeaders() })
    const json = await res.json()
    if (!json.success) return { success: false, error: json.error }
    return {
      success: true,
      balance: json.data.balance,
      accountName: json.data.accountName,
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
  c: Pick<Candidate, 'full_name' | 'surname' | 'total_score' | 'is_disqualified'>,
): string {
  const name = candidateDisplayName(c)
  const score = c.total_score

  if (c.is_disqualified) {
    return (
      `Dear ${name}, your pastoral appointment application has been received. ` +
      `Your score is ${score}/1350. Your application has been flagged for review by leadership. ` +
      `You will be contacted in due course. - First Love Church`
    )
  }

  if (score >= SCORE_THRESHOLD) {
    return (
      `Dear ${name}, your pastoral appointment application has been received. ` +
      `Your score is ${score}/1350 - above the ${SCORE_THRESHOLD}-point threshold. ` +
      `Your application is now under review. You will be contacted with further information. ` +
      `- First Love Church`
    )
  }

  // Score < 700 — neutral confirmation only; rejection is communicated by admin
  return (
    `Dear ${name}, your pastoral appointment application has been received and is being reviewed. ` +
    `Your score is ${score}/1350. You will be contacted by church leadership in due course. ` +
    `- First Love Church`
  )
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
        `Church leadership will be in contact with you regarding next steps. - First Love Church`
      )
    case 'rejected':
      // No SMS — rejection is communicated personally by admin/lead pastor
      return null
    case 'under_review':
      return (
        `Dear ${name}, your pastoral appointment application is now under review by church leadership. ` +
        `You will be contacted with a decision in due course. - First Love Church`
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
    `Review at /admin/candidates`
  )
}
