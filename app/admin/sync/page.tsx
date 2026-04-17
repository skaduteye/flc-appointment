'use client'

import { useEffect, useRef, useState } from 'react'

interface ImportResult {
  inserted: number
  skipped: number
  errors?: string[]
}

export default function ImportPage() {
  const [smsBalance, setSmsBalance] = useState<number | null>(null)
  const [dbCount, setDbCount] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string[][] | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/sms/balance')
      .then((r) => r.json())
      .then((d) => { if (d.balance !== undefined) setSmsBalance(d.balance) })
      .catch(() => {})

    fetch('/api/candidates?limit=1')
      .then((r) => r.json())
      .then((d) => { if (typeof d.count === 'number') setDbCount(d.count) })
      .catch(() => {})
  }, [])

  function parsePreview(text: string): string[][] {
    return text
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(0, 6)
      .map((line) => {
        const cols: string[] = []
        let cur = ''
        let inQ = false
        for (const ch of line) {
          if (ch === '"') { inQ = !inQ }
          else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
          else { cur += ch }
        }
        cols.push(cur.trim())
        return cols.slice(0, 8)
      })
  }

  function handleFile(f: File | null) {
    setFile(f)
    setResult(null)
    setError(null)
    setPreview(null)
    if (!f) return
    f.text().then((txt) => setPreview(parsePreview(txt)))
  }

  async function runImport() {
    if (!file) return
    setImporting(true)
    setResult(null)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/import/csv', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setResult(data)
      setFile(null)
      setPreview(null)
      if (inputRef.current) inputRef.current.value = ''
      fetch('/api/candidates?limit=1')
        .then((r) => r.json())
        .then((d) => { if (typeof d.count === 'number') setDbCount(d.count) })
        .catch(() => {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
        <p className="text-gray-500 text-sm mt-1">
          Import historical candidate data from a CSV export of the original Google Sheet.
        </p>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{dbCount ?? '—'}</div>
          <div className="text-gray-500 text-sm mt-1">Candidates in database</div>
        </div>
        <div className={`rounded-xl border shadow-sm p-4 text-center ${
          smsBalance === null ? 'bg-white border-gray-200' :
          smsBalance < 50 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        }`}>
          <div className={`text-3xl font-bold ${
            smsBalance === null ? 'text-gray-400' :
            smsBalance < 50 ? 'text-red-600' : 'text-green-700'
          }`}>
            {smsBalance !== null ? smsBalance.toLocaleString() : '—'}
          </div>
          <div className="text-gray-500 text-sm mt-1">SMS credits</div>
          {smsBalance !== null && smsBalance < 50 && (
            <div className="text-red-600 text-xs mt-1 font-medium">Low balance</div>
          )}
        </div>
      </div>

      {/* Column mapping reference */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-gray-800 text-sm">Expected Column Order</h2>
        <p className="text-gray-500 text-xs">
          The CSV must match the original Google Sheet column layout. Columns 7, 13, and 23 are ignored (empty in the sheet).
        </p>
        <div className="overflow-x-auto">
          <table className="text-xs text-gray-600 w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1 pr-3 font-semibold text-gray-500">Col</th>
                <th className="text-left py-1 font-semibold text-gray-500">Field</th>
                <th className="text-left py-1 pl-6 font-semibold text-gray-500">Col</th>
                <th className="text-left py-1 font-semibold text-gray-500">Field</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['0', 'full_name', '17', 'is_missionary_wife'],
                ['1', 'is_born_again', '18', 'is_benmp'],
                ['2', 'speaks_in_tongues', '19', 'preaches_to_20plus'],
                ['3', 'has_call_to_ministry', '20', 'preaches_to_10_or_less'],
                ['4', 'prays_regularly', '21', 'centers_planted'],
                ['5', 'pays_tithes_regularly', '22', 'camps_with_prophet'],
                ['6', 'has_spiritual_character_problem', '24', 'camps_with_bishops'],
                ['8', 'has_known_moral_problem', '25', 'root_camps_attended'],
                ['9', 'is_known_thief', '26', 'has_tablet_with_books'],
                ['10', 'has_shown_disloyalty', '27', 'has_hard_copies_books'],
                ['11', 'years_of_membership', '28', 'has_tablet_with_bibles'],
                ['12', 'volunteer_times', '29', 'has_audio_library_access'],
                ['14', 'years_fulltime_worker', '30', 'communicates_with_prophet'],
                ['15', 'is_fulltime_ministry', '31', 'communicates_with_mothers'],
                ['16', 'is_missionary', '32', 'communicates_with_bishops'],
                ['', '', '33', 'interest_in_church_activities'],
              ].map(([c1, f1, c2, f2], i) => (
                <tr key={i}>
                  <td className="py-1 pr-3 font-mono text-blue-700">{c1}</td>
                  <td className="py-1 font-mono">{f1}</td>
                  <td className="py-1 pl-6 font-mono text-blue-700">{c2}</td>
                  <td className="py-1 font-mono">{f2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-gray-500 text-xs">
          Boolean fields accept: <code className="bg-white px-1 rounded">yes / true / 1</code> (case-insensitive).
          Numeric fields accept integers; non-numeric values default to 0.
          The first 1–2 header rows are automatically skipped.
        </p>
      </div>

      {/* File upload */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Upload CSV</h2>
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f) handleFile(f)
          }}
        >
          {file ? (
            <div className="space-y-1">
              <div className="text-sm font-medium text-blue-700">{file.name}</div>
              <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-gray-400 text-3xl">↑</div>
              <div className="text-sm text-gray-600">Drop a CSV file here, or click to browse</div>
              <div className="text-xs text-gray-400">.csv files only</div>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        {file && (
          <div className="flex gap-3">
            <button
              onClick={runImport}
              disabled={importing}
              className="flex-1 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors text-sm"
            >
              {importing ? 'Importing…' : 'Import CSV'}
            </button>
            <button
              onClick={() => handleFile(null)}
              className="px-4 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && preview.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">Preview (first 6 rows, first 8 columns)</h2>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={i === 0 ? 'bg-gray-50 font-semibold' : ''}>
                    {row.map((cell, j) => (
                      <td key={j} className="border border-gray-200 px-2 py-1 max-w-[120px] truncate text-gray-700">
                        {cell || <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-2">
          <div className="text-green-800 font-semibold text-sm">Import complete</div>
          <div className="text-green-700 text-sm">
            {result.inserted} candidates inserted · {result.skipped} rows skipped
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="mt-2">
              <div className="text-yellow-700 text-xs font-medium mb-1">{result.errors.length} row error(s):</div>
              <ul className="text-yellow-700 text-xs space-y-0.5 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  )
}
