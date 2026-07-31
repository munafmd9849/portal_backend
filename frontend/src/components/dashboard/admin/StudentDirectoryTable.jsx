import React, { useMemo } from 'react';
import { Download, Edit3, Eye, FileSpreadsheet, Search, ShieldAlert, ShieldOff, Sparkles } from 'lucide-react';
import { Spinner } from '../../ui/loading';

const ACTIONS_WIDTH = 132;
const SR_WIDTH = 56;
const NAME_WIDTH = 200;

const ACTION_BTN =
  'p-1.5 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const BADGE_STYLES = {
  green: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  mint: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  yellow: 'bg-amber-50 text-amber-800 border border-amber-100',
  pink: 'bg-rose-50 text-rose-700 border border-rose-100',
  blue: 'bg-sky-50 text-sky-700 border border-sky-100',
  red: 'bg-rose-50 text-rose-700 border border-rose-100',
  gray: 'bg-gray-100 text-gray-600 border border-gray-200',
};

function StatusBadge({ label, variant = 'gray' }) {
  if (!label || label === '--') {
    return <span className="text-gray-400 text-sm">—</span>;
  }
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${BADGE_STYLES[variant] || BADGE_STYLES.gray}`}
    >
      {label}
    </span>
  );
}

const BASIC_COLUMNS = [
  { key: 'email', label: 'Email', minW: 180 },
  { key: 'program', label: 'Program', minW: 130 },
  { key: 'cohort', label: 'Cohort', minW: 140 },
  { key: 'currentLocation', label: 'Location', minW: 120 },
  { key: 'contactNumber', label: 'Contact', minW: 120 },
  { key: 'csStatus', label: 'CS Status', minW: 100, badge: 'csStatus' },
  { key: 'activation', label: 'Activation', minW: 96, badge: 'activation' },
];

const MOCK_INTERVIEW_COLUMN = [
  { key: 'mockInterviews', label: 'Mock interviews', minW: 110 },
];

const ATS_COLUMN = [
  { key: 'atsScore', label: 'Resume ATS', minW: 220, ats: true },
];

const STATS_COLUMNS = [
  { key: 'placementStatus', label: 'Placement', minW: 110, badge: 'placementStatus' },
  { key: 'jobsAssigned', label: 'Assigned', minW: 88, metric: 'default' },
  { key: 'eligibleJobs', label: 'Eligible', minW: 80, metric: 'default' },
  { key: 'jobsApplied', label: 'Applied', minW: 80, metric: 'blue' },
  { key: 'appliedClosed', label: 'Closed', minW: 80, metric: 'green' },
  { key: 'noShows', label: 'No-shows', minW: 80, metric: 'default' },
  { key: 'unapplied', label: 'Unapplied', minW: 88, metric: 'default' },
];

const METRIC_TEXT = {
  default: 'text-gray-700 font-medium',
  blue: 'text-sky-700 font-medium',
  green: 'text-emerald-700 font-medium',
  lime: 'text-gray-700 font-medium',
  orange: 'text-amber-700 font-medium',
};

function headerClass(col) {
  return 'bg-slate-50 text-slate-700 border-slate-200/60';
}

function formatSrNo(n) {
  if (n == null) return '—';
  return String(n).padStart(2, '0');
}

function displayMock(val) {
  if (val == null || val === '' || val === '—' || val === '-') return '—';
  return val;
}

function atsScoreColor(score) {
  if (score == null) return 'bg-slate-100 text-slate-600';
  if (score >= 80) return 'bg-emerald-100 text-emerald-800';
  if (score >= 60) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

function cellContent(row, col, { onViewAtsDetails, onScoreAts, scoringStudentId, batchAtsRunning }) {
  if (col.badge === 'csStatus') {
    return <StatusBadge label={row.csStatus?.label} variant={row.csStatus?.variant} />;
  }
  if (col.badge === 'activation') {
    return <StatusBadge label={row.activation?.label} variant={row.activation?.variant} />;
  }
  if (col.badge === 'placementStatus') {
    return <StatusBadge label={row.placementStatus?.label} variant={row.placementStatus?.variant} />;
  }
  if (col.key === 'mockInterviews') {
    return (
      <span className="text-sm font-medium text-gray-700 tabular-nums">
        {displayMock(row.mockInterviews)}
      </span>
    );
  }
  if (col.ats) {
    return (
      <div className="flex items-center justify-center gap-2.5 min-w-[200px] whitespace-nowrap">
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold tabular-nums shrink-0 ${atsScoreColor(row.atsScore)}`}>
          {row.atsScore != null ? `${row.atsScore}%` : row.hasResume ? 'Unscored' : '—'}
        </span>
        {row.hasResume && (
          <>
            {row.atsAnalysis && (
              <button
                type="button"
                onClick={() => onViewAtsDetails?.(row)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 shrink-0"
              >
                Details
              </button>
            )}
            <button
              type="button"
              onClick={() => onScoreAts?.(row)}
              disabled={scoringStudentId === row.id || batchAtsRunning}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 shrink-0"
            >
              {scoringStudentId === row.id ? (
                <Spinner size="sm" className="h-3 w-3 shrink-0" />
              ) : (
                <Sparkles className="w-3 h-3 shrink-0" />
              )}
              <span>{row.atsScore != null ? 'Re-score' : 'Score'}</span>
            </button>
          </>
        )}
      </div>
    );
  }
  if (col.metric) {
    const val = row[col.key];
    const display = val === 0 || val ? val : '—';
    return (
      <span className={`text-sm tabular-nums block truncate ${METRIC_TEXT[col.metric]}`}>
        {display}
      </span>
    );
  }
  const val = row[col.key];
  return (
    <span className="text-sm text-gray-600 truncate block w-full min-w-0" title={val || ''}>
      {val || '—'}
    </span>
  );
}

function RowActions({
  row,
  operationLoading,
  canModifyStudents,
  isSuperAdmin,
  onView,
  onEdit,
  onBlock,
}) {
  const blockDisabled =
    !canModifyStudents?.() ||
    operationLoading ||
    (row.status === 'Blocked' && row.blockInfo?.type === 'permanent' && !isSuperAdmin?.());

  const blockTitle =
    row.status === 'Blocked' && row.blockInfo?.type === 'permanent' && !isSuperAdmin?.()
      ? 'Permanently blocked — only Super Admin can unblock'
      : row.status === 'Blocked'
        ? 'Unblock student'
        : 'Block student';

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onView?.(row)}
        className={`${ACTION_BTN} bg-white text-gray-600 border-gray-200 hover:bg-gray-50`}
        title="View profile"
      >
        <Eye className="w-4 h-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => onEdit?.(row)}
        disabled={!canModifyStudents?.() || operationLoading}
        className={`${ACTION_BTN} bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100`}
        title="Edit student"
      >
        {operationLoading ? (
          <Spinner size="sm" />
        ) : (
          <Edit3 className="w-4 h-4" strokeWidth={2} />
        )}
      </button>
      <button
        type="button"
        onClick={() => onBlock?.(row)}
        disabled={blockDisabled}
        className={`${ACTION_BTN} ${
          row.status === 'Blocked'
            ? 'bg-slate-700 hover:bg-slate-800 text-white border-slate-700'
            : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
        }`}
        title={blockTitle}
      >
        {operationLoading ? (
          <Spinner size="sm" />
        ) : row.status === 'Blocked' ? (
          <ShieldOff className="w-4 h-4" strokeWidth={2} />
        ) : (
          <ShieldAlert className="w-4 h-4" strokeWidth={2} />
        )}
      </button>
    </div>
  );
}

export default function StudentDirectoryTable({
  rows = [],
  showingCount = 0,
  totalCount = 0,
  searchQuery = '',
  onSearchChange,
  onExport,
  onExportToSheets,
  sheetsExporting = false,
  onConfigureSheets,
  showSheetsConfig = false,
  operationLoading = false,
  canModifyStudents,
  isSuperAdmin,
  onView,
  onEdit,
  onBlock,
  onScoreAts,
  onBatchScoreAts,
  onViewAtsDetails,
  scoringStudentId = null,
  batchAtsRunning = false,
}) {
  const allScrollColumns = useMemo(
    () => [
      ...BASIC_COLUMNS,
      ...MOCK_INTERVIEW_COLUMN,
      ...ATS_COLUMN,
      ...STATS_COLUMNS,
    ],
    [],
  );

  const tableMinWidth = useMemo(
    () =>
      SR_WIDTH +
      NAME_WIDTH +
      ACTIONS_WIDTH +
      allScrollColumns.reduce((sum, col) => sum + col.minW, 0),
    [allScrollColumns],
  );

  const stickyShadow = 'shadow-[3px_0_6px_-2px_rgba(0,0,0,0.04)]';
  const stickyHeaderCell =
    'sticky z-30 bg-gray-50 border-r border-gray-200 text-gray-500 font-medium text-xs overflow-hidden';
  const stickyBodyCell =
    'sticky z-20 bg-white group-hover:bg-sky-50 border-r border-gray-100 overflow-hidden align-middle';
  const scrollHeaderCell =
    'px-3 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap border-r border-gray-200 last:border-r-0 bg-gray-50 overflow-hidden';
  const scrollBodyCell =
    'relative z-0 px-3 py-3 border-r border-gray-100 align-middle bg-white group-hover:bg-sky-50 text-gray-600 overflow-hidden max-w-0';

  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const colStyle = (width) => ({
    width,
    minWidth: width,
    maxWidth: width,
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <p className="text-sm text-gray-500">
          Showing <span className="text-gray-900 font-semibold tabular-nums">{showingCount}</span>
          {' '}of{' '}
          <span className="text-gray-900 font-semibold tabular-nums">{totalCount}</span> students
        </p>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" strokeWidth={2} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search students…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white"
            />
          </div>
          <button
            type="button"
            onClick={onBatchScoreAts}
            disabled={batchAtsRunning || operationLoading}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold border border-indigo-200 rounded-xl text-indigo-700 hover:bg-indigo-50 active:scale-95 transition-all bg-white disabled:opacity-50"
            title="Score up to 15 unscored primary resumes"
          >
            {batchAtsRunning ? (
              <Spinner size="sm" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Score unscored
          </button>
          <button
            type="button"
            onClick={onExportToSheets}
            disabled={sheetsExporting}
            className="p-2 border border-slate-200 rounded-xl text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 active:scale-95 transition-all bg-white disabled:opacity-50"
            title="Export to Google Sheets"
          >
            {sheetsExporting ? (
              <Spinner size="md" />
            ) : (
              <FileSpreadsheet className="w-5 h-5" />
            )}
          </button>
          {showSheetsConfig && (
            <button
              type="button"
              onClick={onConfigureSheets}
              className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
              title="Configure Google Sheets workbook"
            >
              Sheets setup
            </button>
          )}
          <button
            type="button"
            onClick={onExport}
className="p-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors bg-white"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <table
          className="w-full border-collapse table-fixed text-left"
          style={{ width: tableMinWidth, minWidth: tableMinWidth }}
        >
          <thead>
            <tr className="border-b border-gray-200">
              <th
                className={`${stickyHeaderCell} left-0 px-3 py-2.5 text-center`}
                style={colStyle(SR_WIDTH)}
              >
                #
              </th>
              <th
                className={`${stickyHeaderCell} px-4 py-2.5 ${stickyShadow}`}
                style={{ ...colStyle(NAME_WIDTH), left: SR_WIDTH }}
              >
                Name
              </th>
              {allScrollColumns.map((col) => (
                <th
                  key={col.key}
className={`${scrollHeaderCell} font-outfit ${headerClass(col)} ${col.ats ? 'text-center' : ''}`}
                  style={colStyle(col.minW)}
                >
                  <span className="block truncate" title={col.label}>{col.label}</span>
                </th>
              ))}
              <th
                className="sticky right-0 z-30 bg-gray-50 px-3 py-2.5 text-xs font-medium text-gray-500 border-l border-gray-200 text-center shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.04)] overflow-hidden"
                style={colStyle(ACTIONS_WIDTH)}
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
                  style={colStyle(SR_WIDTH)}
                >
                  {formatSrNo(row.srNo)}
                </td>
                <td
                  className={`${stickyBodyCell} px-4 py-3 ${stickyShadow}`}
                  style={{ ...colStyle(NAME_WIDTH), left: SR_WIDTH }}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center font-semibold text-xs shrink-0">
                      {getInitials(row.fullName || row.email)}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p
                        className="font-medium text-gray-900 text-sm truncate"
                        title={row.fullName || row.email}
                      >
                        {row.fullName || '—'}
                      </p>
                      {row.enrollmentId && (
                        <span className="text-xs text-gray-400 block truncate" title={row.enrollmentId}>
                          {row.enrollmentId}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                {allScrollColumns.map((col) => (
                  <td
                    key={col.key}
className={`${scrollBodyCell} ${col.ats ? 'text-center' : ''}`}
                    style={colStyle(col.minW)}
                  >
                    {cellContent(row, col, { onViewAtsDetails, onScoreAts, scoringStudentId, batchAtsRunning })}
                  </td>
                ))}
                <td
                  className={`${stickyBodyCell} right-0 z-20 px-3 py-3 border-l border-gray-100 text-center shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.04)]`}
                  style={colStyle(ACTIONS_WIDTH)}
                >
                  <RowActions
                    row={row}
                    operationLoading={operationLoading}
                    canModifyStudents={canModifyStudents}
                    isSuperAdmin={isSuperAdmin}
                    onView={onView}
                    onEdit={onEdit}
                    onBlock={onBlock}
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
