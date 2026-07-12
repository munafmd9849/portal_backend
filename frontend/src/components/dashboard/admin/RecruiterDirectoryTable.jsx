import React from 'react';
import {
  Briefcase,
  Eye,
  History,
  Loader,
  Mail,
  Search,
  ShieldAlert,
  ShieldOff,
} from 'lucide-react';

const ACTIONS_WIDTH = 168;
const SR_WIDTH = 56;
const COMPANY_WIDTH = 200;

const ACTION_BTN =
  'p-1.5 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const SCROLL_COLUMNS = [
  { key: 'recruiterName', label: 'Recruiter', minW: 140 },
  { key: 'email', label: 'Email', minW: 180 },
  { key: 'location', label: 'Location', minW: 120 },
  { key: 'lastJobPostedAt', label: 'Last job posted', minW: 130 },
  { key: 'status', label: 'Status', minW: 100, badge: 'status' },
];

const STATUS_BADGE_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  inactive: 'bg-amber-50 text-amber-800 border border-amber-100',
  blocked: 'bg-rose-50 text-rose-700 border border-rose-100',
};

function StatusBadge({ status }) {
  const norm = String(status || 'ACTIVE').toUpperCase();
  let label = 'Active';
  let styleKey = 'active';
  if (norm === 'BLOCKED') {
    label = 'Blocked';
    styleKey = 'blocked';
  } else if (norm === 'INACTIVE' || norm === 'PENDING' || norm === 'REJECTED') {
    label = norm === 'PENDING' ? 'Pending' : norm === 'REJECTED' ? 'Rejected' : 'Inactive';
    styleKey = 'inactive';
  }
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${STATUS_BADGE_STYLES[styleKey]}`}
    >
      {label}
    </span>
  );
}

function formatSrNo(n) {
  if (n == null) return '—';
  return String(n).padStart(2, '0');
}

function getInitials(name) {
  if (!name) return 'RC';
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function cellContent(row, col) {
  if (col.badge === 'status') {
    return <StatusBadge status={row.status} />;
  }
  const val = row[col.key];
  return (
    <span className="text-sm text-gray-600 truncate block max-w-[220px]" title={val || ''}>
      {val || '—'}
    </span>
  );
}

function RowActions({
  row,
  canSendMail,
  isSuperAdmin,
  blockLoading,
  onMail,
  onViewJobs,
  onBlock,
  onHistory,
}) {
  const isBlocked = String(row.status || '').toUpperCase() === 'BLOCKED';

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onMail?.(row)}
        disabled={!canSendMail}
        className={`${ACTION_BTN} bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100`}
        title="Send mail"
      >
        <Mail className="w-4 h-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => onViewJobs?.(row)}
        className={`${ACTION_BTN} bg-white text-gray-600 border-gray-200 hover:bg-gray-50`}
        title="View job descriptions"
      >
        <Eye className="w-4 h-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => onBlock?.(row)}
        disabled={!isSuperAdmin || blockLoading}
        className={`${ACTION_BTN} ${
          isBlocked
            ? 'bg-slate-700 hover:bg-slate-800 text-white border-slate-700'
            : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
        }`}
        title={isBlocked ? 'Unblock recruiter' : 'Block recruiter (Super Admin only)'}
      >
        {blockLoading ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : isBlocked ? (
          <ShieldOff className="w-4 h-4" strokeWidth={2} />
        ) : (
          <ShieldAlert className="w-4 h-4" strokeWidth={2} />
        )}
      </button>
      <button
        type="button"
        onClick={() => onHistory?.(row)}
        className={`${ACTION_BTN} bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100`}
        title="View history"
      >
        <History className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}

export default function RecruiterDirectoryTable({
  rows = [],
  showingCount = 0,
  totalCount = 0,
  searchQuery = '',
  onSearchChange,
  canSendMail = false,
  isSuperAdmin = false,
  operationLoading = {},
  onMail,
  onViewJobs,
  onBlock,
  onHistory,
}) {
  const stickyShadow = 'shadow-[3px_0_6px_-2px_rgba(0,0,0,0.04)]';
  const stickyHeaderCell =
    'sticky z-20 bg-gray-50 border-r border-gray-200 text-gray-500 font-medium text-xs';
  const stickyBodyCell =
    'sticky z-20 bg-white group-hover:bg-sky-50/40 border-r border-gray-100 overflow-hidden align-middle';
  const scrollHeaderCell =
    'px-4 py-2.5 text-xs font-medium whitespace-nowrap border-r border-gray-200 last:border-r-0 bg-gray-50 text-gray-500';
  const scrollBodyCell =
    'relative z-0 px-4 py-3 border-r border-gray-100 align-middle bg-white group-hover:bg-sky-50/40 text-gray-600';

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <p className="text-sm text-gray-500">
          Showing <span className="text-gray-900 font-semibold tabular-nums">{showingCount}</span>
          {' '}of{' '}
          <span className="text-gray-900 font-semibold tabular-nums">{totalCount}</span> recruiters
        </p>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search recruiters…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" style={{ minWidth: 1000 }}>
          <thead>
            <tr className="border-b border-gray-200">
              <th
                className={`${stickyHeaderCell} left-0 px-3 py-2.5 text-center`}
                style={{ width: SR_WIDTH, minWidth: SR_WIDTH }}
              >
                #
              </th>
              <th
                className={`${stickyHeaderCell} px-4 py-2.5 ${stickyShadow}`}
                style={{ left: SR_WIDTH, width: COMPANY_WIDTH, minWidth: COMPANY_WIDTH }}
              >
                Company
              </th>
              {SCROLL_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={scrollHeaderCell}
                  style={{ minWidth: col.minW }}
                >
                  {col.label}
                </th>
              ))}
              <th
                className="sticky right-0 z-20 bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-500 border-l border-gray-200 text-center shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.04)]"
                style={{ width: ACTIONS_WIDTH, minWidth: ACTIONS_WIDTH }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="group">
                <td
                  className={`${stickyBodyCell} left-0 px-3 py-3 text-sm text-gray-400 text-center tabular-nums`}
                  style={{ width: SR_WIDTH, minWidth: SR_WIDTH }}
                >
                  {formatSrNo(row.srNo)}
                </td>
                <td
                  className={`${stickyBodyCell} px-4 py-3 ${stickyShadow}`}
                  style={{ left: SR_WIDTH, width: COMPANY_WIDTH, minWidth: COMPANY_WIDTH }}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center font-semibold text-xs shrink-0">
                      {getInitials(row.companyName || row.recruiterName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-medium text-gray-900 text-sm truncate"
                        title={row.companyName}
                      >
                        {row.companyName || '—'}
                      </p>
                      <span className="text-xs text-gray-400 flex items-center gap-1 truncate">
                        <Briefcase className="w-3 h-3 shrink-0" />
                        {row.totalJobPostings ?? 0} jobs
                      </span>
                    </div>
                  </div>
                </td>
                {SCROLL_COLUMNS.map((col) => (
                  <td key={col.key} className={scrollBodyCell} style={{ minWidth: col.minW }}>
                    {cellContent(row, col)}
                  </td>
                ))}
                <td
                  className={`${stickyBodyCell} right-0 px-3 py-3 border-l border-gray-100 text-center shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.04)]`}
                  style={{ width: ACTIONS_WIDTH, minWidth: ACTIONS_WIDTH }}
                >
                  <RowActions
                    row={row}
                    canSendMail={canSendMail}
                    isSuperAdmin={isSuperAdmin}
                    blockLoading={!!operationLoading[`block_${row.id}`]}
                    onMail={onMail}
                    onViewJobs={onViewJobs}
                    onBlock={onBlock}
                    onHistory={onHistory}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
