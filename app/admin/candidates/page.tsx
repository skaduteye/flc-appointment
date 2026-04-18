'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import type { Candidate, CandidateStatus } from '@/lib/types'
import { statusColor, scoreColor, formatDate } from '@/lib/utils'

const STATUS_OPTIONS: (CandidateStatus | '')[] = ['', 'pending', 'under_review', 'approved', 'rejected']

async function exportPDF(candidates: Candidate[], status: CandidateStatus | '') {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text(`FLC Candidates Report${status ? ` — ${status.replace('_', ' ')}` : ''}`, 14, 14)
  doc.setFontSize(9)
  doc.text(`Generated ${new Date().toLocaleString()}  •  ${candidates.length} records`, 14, 20)

  autoTable(doc, {
    startY: 25,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [23, 37, 84], textColor: 255 },
    head: [['Name', 'Surname', 'Gender', 'Phone', 'Oversight', 'Score', 'Disq.', 'Status', 'Submitted']],
    body: candidates.map((c) => [
      c.full_name,
      c.surname,
      c.gender ?? '',
      c.phone_number ?? '',
      c.oversight ?? '',
      c.total_score,
      c.is_disqualified ? 'Yes' : 'No',
      c.status.replace('_', ' '),
      formatDate(c.created_at),
    ]),
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  const dateStr = new Date().toISOString().slice(0, 10)
  doc.save(`candidates${status ? `-${status}` : ''}-${dateStr}.pdf`)
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CandidateStatus | ''>('')
  const [sort, setSort] = useState('total_score')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | 'zip' | null>(null)

  async function handleExport(format: 'csv' | 'pdf' | 'zip') {
    setExporting(format)
    try {
      if (format === 'pdf') {
        await exportPDF(candidates, status)
      } else {
        const params = new URLSearchParams()
        if (status) params.set('status', status)
        if (search) params.set('search', search)
        const url = `/api/export/${format}?${params}`
        const a = document.createElement('a')
        a.href = url
        a.click()
        // Give the browser a moment to start the download
        await new Promise((r) => setTimeout(r, 800))
      }
    } finally {
      setExporting(null)
    }
  }

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

    try {
      const res = await fetch(`/api/candidates?${params}`)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setCandidates(data.data ?? [])
      setTotal(data.count ?? 0)
    } catch (err) {
      console.error('Failed to fetch candidates:', err)
    } finally {
      setLoading(false)
    }
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 mr-1">Export filtered:</span>
          {(['csv', 'pdf', 'zip'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              disabled={exporting !== null || candidates.length === 0}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors uppercase tracking-wide"
            >
              {exporting === fmt ? '…' : fmt}
            </button>
          ))}
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

      {/* Table — desktop */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
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

      {/* Card list — mobile */}
      <div className="sm:hidden space-y-2">
        {loading && <p className="text-center text-gray-400 text-sm py-8">Loading…</p>}
        {!loading && candidates.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No candidates found</p>
        )}
        {candidates.map((c) => (
          <Link
            key={c.id}
            href={`/admin/candidates/${c.id}`}
            className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm"
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{c.full_name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(c.status)}`}>
                  {c.status.replace('_', ' ')}
                </span>
                {c.is_disqualified && (
                  <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">FLAGGED</span>
                )}
                <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
              </div>
            </div>
            <span className={`font-bold text-base ml-3 shrink-0 ${scoreColor(c.total_score, c.is_disqualified)}`}>
              {c.total_score}
            </span>
          </Link>
        ))}
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
