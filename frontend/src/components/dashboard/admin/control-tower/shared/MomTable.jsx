import React, { useMemo, useState } from 'react';

export default function MomTable({ rows = [], columns = [] }) {
  const [search, setSearch] = useState('');
  const defaultCols = columns.length
    ? columns
    : [
      { key: 'crManager', label: 'CR Manager' },
      { key: 'segment', label: 'Segment' },
      { key: 'goal', label: 'Goal' },
      { key: 'closedDrives', label: 'Closed' },
      { key: 'achievedGoalPct', label: 'Achieved %' },
      { key: 'companies', label: 'Companies' },
      { key: 'jobs', label: 'Jobs' },
      { key: 'transitions', label: 'Transitions' },
      { key: 'yetToStart', label: 'Yet to Start' },
      { key: 'hold', label: 'Hold' },
      { key: 'inProcess', label: 'In Process' },
      { key: 'notApplied', label: 'Not Applied' },
      { key: 'notDeliverable', label: 'Not Deliverable' },
    ];

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) => String(r.crManager || r.manager || '').toLowerCase().includes(q)
        || String(r.segment || '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">CR Manager wise MoM Detailed Analysis</p>
        <input
          type="search"
          placeholder="Search manager or segment…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-full sm:w-64"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 text-gray-600 uppercase tracking-wide">
            <tr>
              {defaultCols.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={defaultCols.length} className="px-3 py-8 text-center text-gray-500">No rows</td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={row.id || i} className="hover:bg-gray-50">
                  {defaultCols.map((col) => (
                    <td key={col.key} className="px-3 py-2 tabular-nums text-gray-800 whitespace-nowrap">
                      {row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
