import type { SupabaseClient } from '@supabase/supabase-js'
import { isValidGhanaPhone, normaliseGhanaPhone } from './sms'

export function normalizePhoneForDedup(raw: string | null | undefined): string | null {
  if (!raw) return null
  const normalized = normaliseGhanaPhone(raw)
  return isValidGhanaPhone(normalized) ? normalized : null
}

function normalizeIdentityChunk(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeIdentityForDedup(
  fullName: string | null | undefined,
  surname: string | null | undefined,
): string | null {
  const name = normalizeIdentityChunk(fullName)
  const last = normalizeIdentityChunk(surname)
  const key = `${name}|${last}`
  return key === '|' ? null : key
}

export async function invalidateOlderDuplicates(
  supabase: SupabaseClient,
  activeId: string,
  normalizedPhone: string | null,
  identityKey: string | null,
): Promise<void> {
  const duplicateIdSet = new Set<string>()

  if (!normalizedPhone && !identityKey) {
    return
  }

  if (normalizedPhone) {
    const { data: phoneDuplicates, error: phoneError } = await supabase
      .from('candidates')
      .select('id')
      .eq('phone_number_normalized', normalizedPhone)
      .neq('id', activeId)
      .eq('is_invalid', false)

    if (phoneError) {
      throw new Error(`Failed finding phone duplicates: ${phoneError.message}`)
    }

    for (const row of phoneDuplicates ?? []) {
      duplicateIdSet.add(row.id)
    }
  }

  if (identityKey) {
    const { data: identityDuplicates, error: identityError } = await supabase
      .from('candidates')
      .select('id')
      .eq('dedup_identity_key', identityKey)
      .neq('id', activeId)
      .eq('is_invalid', false)

    if (identityError) {
      throw new Error(`Failed finding identity duplicates: ${identityError.message}`)
    }

    for (const row of identityDuplicates ?? []) {
      duplicateIdSet.add(row.id)
    }
  }

  const duplicateIds = Array.from(duplicateIdSet)
  if (duplicateIds.length > 0) {
    const { error: markError } = await supabase
      .from('candidates')
      .update({
        is_duplicate: true,
        is_invalid: true,
        duplicate_of_id: activeId,
      })
      .in('id', duplicateIds)

    if (markError) {
      throw new Error(`Failed marking duplicates: ${markError.message}`)
    }
  }

  const { error: keepError } = await supabase
    .from('candidates')
    .update({
      phone_number_normalized: normalizedPhone,
      dedup_identity_key: identityKey,
      is_duplicate: false,
      is_invalid: false,
      duplicate_of_id: null,
    })
    .eq('id', activeId)

  if (keepError) {
    throw new Error(`Failed marking latest record active: ${keepError.message}`)
  }
}
