'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import type { Candidate, CandidateStatus } from '@/lib/types'
import { statusColor, scoreColor, formatDate } from '@/lib/utils'

const STATUS_OPTIONS: (CandidateStatus | '')[] = ['', 'pending', 'under_review', 'approved', 'rejected']

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CandidateStatus | ''>('')
  const [sort, setSort] = useState('total_score')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)

  const fetchCandidates = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      sort,
      order,
      page: String(page),
      limit: '50',
    })
    if (search) params.set('search', search)
    if (status) params.set('status', status)

    const res = await fetch(`/api/candidates?${params}`)
    const data = await res.json()
    setCandidates(data.data ?? [])
    setTotal(data.count ?? 0)
    setLoading(false)
  }, [search, status, sort, order, page])

  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])

  function toggleSort(field: string) {
    if (sort === field) {
      setOrder(order === 'desc' ? 'asc' : 'desc')
    } else {
      setSort(field)
      setOrder('desc')
    }
    setPage(1)
  }

  function SortHeader({ field, label }: { field: string; label: string }) {
    return (
      <button
        onClick={() => toggleSort(field)}
        className="flex items-center gap-1 hover:text-gray-900 transition-colors"
      >
        {label}
        {sort === field && <span className="text-blue-600">{order === 'desc' ? '↓' : '↑'}</span>}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as CandidateStatus | ''); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === '' ? 'All statuses' : s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 text-left"><SortHeader field="full_name" label="Name" /></th>
              <th className="px-6 py-3 text-right"><SortHeader field="total_score" label="Score" /></th>
              <th className="px-6 py-3 text-center">Flags</th>
              <th className="px-6 py-3 text-center"><SortHeader field="status" label="Status" /></th>
              <th className="px-6 py-3 text-right"><SortHeader field="created_at" label="Submitted" /></th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : candidates.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No candidates found</td></tr>
            ) : candidates.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{c.full_name}</td>
                <td className={`px-6 py-3 text-right font-bold ${scoreColor(c.total_score, c.is_disqualified)}`}>
                  {c.total_score}
                </td>
                <td className="px-6 py-3 text-center">
                  {c.is_disqualified && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      FLAGGED
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(c.status)}`}>
                    {c.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-gray-500">{formatDate(c.created_at)}</td>
                <td className="px-6 py-3 text-right">
                  <Link
                    href={`/admin/candidates/${c.id}`}
                    className="text-blue-700 hover:underline text-xs font-medium"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {Math.ceil(total / 50)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 50)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
