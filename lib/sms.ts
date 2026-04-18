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
  // Validate and normalise all numbers first
  const validPhones: string[] = []
  for (const recipient of recipients) {
    const phone = normaliseGhanaPhone(recipient)
    if (!isValidGhanaPhone(phone)) {
      return { success: false, error: `Invalid phone number: ${recipient}` }
    }
    validPhones.push(phone)
  }

  try {
    const res = await fetch(`${BASE_URL}/sms/send`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        recipients: validPhones,
        message,
        senderId: getSenderId(),
        ...(campaignName ? { campaignName } : {}),
      }),
    })

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      const text = await res.text()
      console.error('FlashSMS returned non-JSON:', res.status, text.slice(0, 200))
      return { success: false, error: `FlashSMS returned HTTP ${res.status} (non-JSON)` }
    }

    const json = await res.json()
    if (!json.success) {
      console.error('FlashSMS sendSms error:', JSON.stringify(json))
      const errMsg = typeof json.error === 'string' ? json.error : JSON.stringify(json)
      return { success: false, error: errMsg }
    }

    return {
      success: true,
      messageId: json.data?.messageId,
      recipientsSent: json.data?.recipientsSent,
      creditsUsed: json.data?.creditsUsed,
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

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      const text = await res.text()
      console.error('FlashSMS returned non-JSON:', res.status, text.slice(0, 200))
      return { success: false, error: `FlashSMS returned HTTP ${res.status} (non-JSON)` }
    }

    const json = await res.json()
    if (!json.success) return { success: false, error: json.error }
    return {
      success: true,
      messageId: json.data?.messageId,
      recipientsSent: json.data?.recipientsSent,
      creditsUsed: json.data?.creditsUsed,
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

