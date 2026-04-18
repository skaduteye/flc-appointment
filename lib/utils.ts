import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function scoreColor(score: number) {
  if (score >= 800) return 'text-green-600'
  if (score >= 400) return 'text-yellow-600'
  return 'text-gray-600'
}

export function scoreBg(score: number) {
  if (score >= 800) return 'bg-green-50 border-green-200'
  if (score >= 400) return 'bg-yellow-50 border-yellow-200'
  return 'bg-gray-50 border-gray-200'
}

export function statusColor(status: string) {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-800'
    case 'rejected': return 'bg-red-100 text-red-800'
    case 'under_review': return 'bg-blue-100 text-blue-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}
