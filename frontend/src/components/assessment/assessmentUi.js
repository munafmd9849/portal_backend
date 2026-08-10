/** Shared Tailwind class tokens for assessments & mock interview surfaces */

export const au = {
  backdrop: 'fixed inset-0 bg-slate-900/45 z-[100] flex items-center justify-center p-4',
  backdropLg: 'fixed inset-0 bg-slate-900/45 z-[9999] flex items-center justify-center p-4 sm:p-6',
  backdropPanel: 'fixed inset-0 bg-slate-900/45 z-[99999]',

  modal:
    'w-full max-w-3xl max-h-[min(90vh,900px)] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col border border-slate-200/80',
  modalLg:
    'w-full max-w-6xl max-h-[min(92vh,920px)] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col border border-slate-200/80',
  modalFull:
    'w-full h-full max-h-screen bg-white shadow-xl flex flex-col border-l border-slate-200',

  modalHeader:
    'shrink-0 px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white',
  modalTitle: 'text-base font-semibold text-slate-900',
  modalSubtitle: 'text-xs text-slate-500 mt-0.5',
  modalBody: 'flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5',
  modalFooter:
    'shrink-0 px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-end gap-2',

  closeBtn:
    'p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors',

  label: 'text-xs font-medium text-slate-600 mb-1.5 block',
  input:
    'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
  textarea:
    'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 resize-y min-h-[88px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
  select:
    'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',

  btnPrimary:
    'inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:pointer-events-none',
  btnSecondary:
    'inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50',
  btnDanger:
    'inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-rose-600 rounded-lg text-sm font-medium border border-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-50',
  btnDangerSolid:
    'inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-50',

  panel: 'rounded-lg border border-slate-200/80 bg-white shadow-sm overflow-hidden',
  panelMuted: 'rounded-lg border border-slate-200 bg-slate-50',
  sectionTitle: 'text-base font-semibold text-slate-900',
  sectionLabel: 'text-sm font-medium text-slate-700',

  statCard: 'rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm',
  statLabel: 'text-xs text-slate-500',
  statValue: 'text-lg font-semibold text-slate-900 tabular-nums mt-0.5',

  scoreHero: 'rounded-lg border border-slate-200 bg-slate-50 p-5',
  accentText: 'text-indigo-700 font-semibold tabular-nums',

  tableWrap: 'overflow-x-auto',
  tableHead: 'bg-slate-50 border-b border-slate-200',
  tableTh: 'px-4 py-3 text-xs font-medium text-slate-500 text-left',
  tableRow: 'hover:bg-slate-50/80 transition-colors border-b border-slate-100',

  tabBar: 'inline-flex p-1 rounded-lg bg-slate-100 border border-slate-200',
  tabActive: 'px-3 py-1.5 rounded-md text-sm font-medium bg-white text-indigo-700 shadow-sm',
  tabIdle:
    'px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors',

  spinner: 'inline-block h-9 w-9 shrink-0 rounded-full animate-spin border-2 border-slate-200 border-t-indigo-600',
  emptyState: 'py-16 text-center text-slate-500 text-sm',

  searchInput:
    'w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',

  wizardInput: 'w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
  wizardTextarea: 'w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
};
