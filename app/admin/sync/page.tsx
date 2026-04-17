'use client'

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'

interface SyncStatus {
  db_row_count: number
  last_synced_at: string | null
}

export default function SyncPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchStatus() {
    const res = await fetch('/api/sync/status')
    const data = await res.json()
    setStatus(data)
  }

  useEffect(() => { fetchStatus() }, [])

  async function runImport() {
    setImporting(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/sync/import', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(`Import complete: ${data.inserted} new, ${data.updated} updated (${data.total} total rows from sheet)`)
      fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  async function runExport() {
    setExporting(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/sync/export', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(`Export complete: ${data.exported} candidates written to Google Sheet`)
      fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Google Sheets Sync</h1>
        <p className="text-gray-500 text-sm mt-1">
          Import candidates from or export candidates to the linked Google Sheet.
        </p>
      </div>

      {/* Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3">
        <h2 className="font-semibold text-gray-800">Current Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-gray-900">{status?.db_row_count ?? '—'}</div>
            <div className="text-gray-500 text-sm mt-1">Candidates in database</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-lg font-semibold text-gray-900">
              {status?.last_synced_at ? formatDate(status.last_synced_at) : 'Never'}
            </div>
            <div className="text-gray-500 text-sm mt-1">Last synced</div>
          </div>
        </div>
      </div>

      {/* Import */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Import from Google Sheet</h2>
          <p className="text-gray-500 text-sm mt-1">
            Reads all rows from the linked Google Sheet and upserts them into the database.
            Existing records are matched by row ID and updated; new rows are inserted.
          </p>
        </div>
        <button
          onClick={runImport}
          disabled={importing || exporting}
          className="w-full py-3 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors"
        >
          {importing ? 'Importing…' : 'Import from Sheet'}
        </button>
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Export to Google Sheet</h2>
          <p className="text-gray-500 text-sm mt-1">
            Writes all candidates from the database back to the Google Sheet, preserving the
            original column order. Overwrites existing data starting from row 3.
          </p>
          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            ⚠ This will overwrite data in the sheet. Make sure to import first if you have
            unsaved changes in the sheet.
          </div>
        </div>
        <button
          onClick={runExport}
          disabled={importing || exporting}
          className="w-full py-3 rounded-lg bg-gray-800 text-white font-semibold hover:bg-gray-900 disabled:opacity-60 transition-colors"
        >
          {exporting ? 'Exporting…' : 'Export to Sheet'}
        </button>
      </div>

      {/* Result / Error */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm font-medium">
          ✓ {result}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Setup instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-3 text-sm text-gray-600">
        <h3 className="font-semibold text-gray-800">Setup Requirements</h3>
        <p>For sync to work, set these environment variables:</p>
        <ul className="space-y-1 list-disc list-inside font-mono text-xs bg-white border border-gray-200 rounded-lg p-4">
          <li>GOOGLE_SHEET_ID — the spreadsheet ID from the URL</li>
          <li>GOOGLE_SA_KEY — JSON content of a Google Service Account key</li>
        </ul>
        <p>
          The service account must have <strong>Editor</strong> access to the spreadsheet.
          Share the sheet with the service account email to grant access.
        </p>
      </div>
    </div>
  )
}
