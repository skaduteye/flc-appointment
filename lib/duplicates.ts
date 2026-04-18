import type { SupabaseClient } from '@supabase/supabase-js'
import { isValidGhanaPhone, normaliseGhanaPhone } from './sms'

export function normalizePhoneForDedup(raw: string | null | undefined): string | null {
  if (!raw) return null
  const normalized = normaliseGhanaPhone(raw)
  return isValidGhanaPhone(normalized) ? normalized : null
}

export async function invalidateOlderPhoneDuplicates(
  supabase: SupabaseClient,
  activeId: string,
  normalizedPhone: string | null,
): Promise<void> {
  if (!normalizedPhone) return

  const { data: duplicates, error: findError } = await supabase
    .from('candidates')
    .select('id')
    .eq('phone_number_normalized', normalizedPhone)
    .neq('id', activeId)
    .eq('is_invalid', false)

  if (findError) {
    throw new Error(`Failed finding duplicates: ${findError.message}`)
  }

  const duplicateIds = (duplicates ?? []).map((d) => d.id)
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
      is_duplicate: false,
      is_invalid: false,
      duplicate_of_id: null,
    })
    .eq('id', activeId)

  if (keepError) {
    throw new Error(`Failed marking latest record active: ${keepError.message}`)
  }
}
