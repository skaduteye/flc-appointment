'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Candidate } from '@/lib/types'
import { statusColor, formatDate, formatStatus } from '@/lib/utils'

interface Stats {
  total: number
  pending: number
  approved: number
  rejected: number
  under_review: number
}

function buildHistogram(candidates: Candidate[]) {
  const buckets = [
    { range: '<0', min: -Infinity, max: 0, count: 0 },
    { range: '0–100', min: 0, max: 100, count: 0 },
    { range: '100–200', min: 100, max: 200, count: 0 },
    { range: '200–300', min: 200, max: 300, count: 0 },
    { range: '300–400', min: 300, max: 400, count: 0 },
    { range: '400–500', min: 400, max: 500, count: 0 },
    { range: '500–600', min: 500, max: 600, count: 0 },
    { range: '600–700', min: 600, max: 700, count: 0 },
    { range: '700–800', min: 700, max: 800, count: 0 },
    { range: '800–900', min: 800, max: 900, count: 0 },
    { range: '900–1000', min: 900, max: 1000, count: 0 },
    { range: '1000+', min: 1000, max: Infinity, count: 0 },
  ]
  candidates.forEach((c) => {
    const b = buckets.find((b) => c.total_score >= b.min && c.total_score < b.max)
    if (b) b.count++
  })
  return buckets
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-gray-500 text-sm mt-1">{label}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [threshold, setThreshold] = useState(700)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    fetch('/api/candidates?limit=200&sort=created_at&order=desc')
      .then((r) => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`)
        return r.json()
      })
      .then((d) => {
        setCandidates(d.data ?? [])
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load candidates:', err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => { if (s.score_threshold) setThreshold(s.score_threshold) })
      .catch(() => {})
  }, [])

  const stats: Stats = {
    total: candidates.length,
    pending: candidates.filter((c) => c.status === 'pending').length,
    approved: candidates.filter((c) => c.status === 'approved').length,
    rejected: candidates.filter((c) => c.status === 'rejected').length,
    under_review: candidates.filter((c) => c.status === 'under_review').length,

  }

  const histogram = buildHistogram(candidates)
  const recent = candidates.slice(0, 10)

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading…</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Pastoral candidate overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total" value={stats.total} color="text-gray-900" />
        <StatCard label={`< ${threshold}`} value={stats.pending} color="text-gray-600" />
        <StatCard label="Approved" value={stats.approved} color="text-green-600" />
        <StatCard label="Rejected" value={stats.rejected} color="text-red-600" />
        <StatCard label="Under Review" value={stats.under_review} color="text-blue-600" />
      </div>

      {/* Score histogram */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Score Distribution</h2>
        {mounted ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={histogram} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {histogram.map((entry) => (
                  <Cell
                    key={entry.range}
                    fill={entry.min >= 700 ? '#16a34a' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px]" />
        )}
      </div>

      {/* Recent submissions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Submissions</h2>
          <Link href="/admin/candidates" className="text-sm text-blue-700 hover:underline">
            View all
          </Link>
        </div>

        {/* Desktop table */}
        <table className="hidden sm:table w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-right">Score</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-right">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recent.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-3">
                  <Link href={`/admin/candidates/${c.id}`} className="font-medium text-blue-700 hover:underline">
                    {c.full_name}
                  </Link>

                </td>
                <td className="px-6 py-3 text-right font-semibold text-gray-900">{c.total_score}</td>
                <td className="px-6 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(c.status)}`}>
                    {formatStatus(c.status, threshold)}
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-gray-500">{formatDate(c.created_at)}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No candidates yet</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-gray-100">
          {recent.length === 0 && (
            <p className="px-4 py-8 text-center text-gray-400 text-sm">No candidates yet</p>
          )}
          {recent.map((c) => (
            <Link key={c.id} href={`/admin/candidates/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{c.full_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(c.status)}`}>
                      {formatStatus(c.status, threshold)}
                  </span>

                </div>
              </div>
              <span className="font-bold text-gray-900 text-sm ml-3 shrink-0">{c.total_score}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
