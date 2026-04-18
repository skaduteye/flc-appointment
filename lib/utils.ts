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

export function formatStatus(status: string, threshold: number): string {
  if (status === 'pending') return `< ${threshold}`
  return status.replace('_', ' ')
}

export function scoreColor(score: number) {
  return score >= 700 ? 'text-green-600' : 'text-red-600'
}

export function scoreBg(score: number) {
  return score >= 700 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
}

export function statusColor(status: string) {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-800'
    case 'rejected': return 'bg-red-100 text-red-800'
    case 'under_review': return 'bg-blue-100 text-blue-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}
