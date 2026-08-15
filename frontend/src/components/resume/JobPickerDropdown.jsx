import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, ChevronDown, X, Search, Building2 } from 'lucide-react';
import { Spinner } from '../ui/loading';
import api from '../../services/api';
import { prep } from '../dashboard/student/interviewPrep/prepTheme';

export default function JobPickerDropdown({
  selectedJob,
  onSelect,
  placeholder = 'Choose a role from job portal',
  className = '',
  compact = false,
  prefetch = false,
}) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [panelStyle, setPanelStyle] = useState(null);
  const ref = useRef(null);

  const loadJobs = async () => {
    if (loading || loaded) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getTargetedJobs();
      const list = Array.isArray(data) ? data : data?.jobs || [];
      setJobs(list.filter((j) => j.status === 'POSTED' || j.postedAt));
      setLoaded(true);
    } catch {
      setError('Could not load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (prefetch) loadJobs();
  }, [prefetch]);

  const updatePanelPosition = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 280),
      zIndex: 9999,
    });
  };

  useEffect(() => {
    const handler = (e) => {
      const inTrigger = ref.current?.contains(e.target);
      const inPanel = e.target.closest('[data-job-picker-panel]');
      if (!inTrigger && !inPanel) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    if (!loaded) loadJobs();
    updatePanelPosition();
    window.addEventListener('scroll', updatePanelPosition, true);
    window.addEventListener('resize', updatePanelPosition);
    return () => {
      window.removeEventListener('scroll', updatePanelPosition, true);
      window.removeEventListener('resize', updatePanelPosition);
    };
  }, [open, loaded]);

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return (
      (j.jobTitle || '').toLowerCase().includes(q) ||
      (j.companyName || '').toLowerCase().includes(q)
    );
  });

  const handleSelect = (job) => {
    onSelect(job);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect(null);
  };

  const triggerClass = compact
    ? `w-full flex items-center gap-2.5 min-h-[42px] px-3 py-2 rounded-lg border text-left transition-all focus:outline-none focus:ring-2 ${prep.ring} ${
        open
          ? `${prep.borderFocus} ${prep.surfaceActive} ring-2 ring-[#8FA8D4]/20`
          : selectedJob
            ? 'border-slate-200 bg-white hover:border-slate-300'
            : 'border-slate-200 bg-white hover:border-[#C5D2E8]'
      }`
    : `w-full flex items-center gap-3 px-4 py-3 border-2 rounded-xl text-left transition-colors focus:outline-none ${
        open ? `${prep.borderFocus} ${prep.surface}` : 'border-slate-200 hover:border-[#C5D2E8] bg-white shadow-sm'
      }`;

  const dropdownPanel =
    open && panelStyle
      ? createPortal(
          <div
            style={panelStyle}
            className={`bg-white border ${prep.border} rounded-lg shadow-lg shadow-slate-900/5 overflow-hidden`}
            data-job-picker-panel
          >
            <div className={`px-3 py-2 border-b ${prep.border} ${prep.surface}`}>
              <div className={`flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-md border ${prep.border}`}>
                <Search className={`w-3.5 h-3.5 ${prep.accentIcon} shrink-0`} strokeWidth={2} />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search role or company"
                  className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none min-w-0"
                />
              </div>
              {loaded && !loading && (
                <p className={`text-[11px] ${prep.accentTextMuted} mt-1.5 px-0.5`}>
                  {filtered.length} role{filtered.length !== 1 ? 's' : ''} available
                </p>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto">
              {loading ? (
                <div className={`flex items-center justify-center py-8 gap-2 ${prep.accentTextMuted}`}>
                  <Spinner size="sm" />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : error ? (
                <div className="text-center py-6 text-sm text-red-600 px-3">{error}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-500 px-3">
                  {search ? 'No matches — try another search' : 'No posted roles right now'}
                </div>
              ) : (
                filtered.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => handleSelect(job)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-slate-100 last:border-0 ${
                        isSelected ? prep.surfaceActive : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-md ${prep.accentSoft} shrink-0`}>
                        <Building2 className={`w-3.5 h-3.5 ${prep.accentIcon}`} strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{job.jobTitle}</p>
                        <p className="text-xs text-slate-600 truncate">{job.companyName || 'Company'}</p>
                      </div>
                      {isSelected && (
                        <span className={`text-[10px] font-medium ${prep.accentText} ${prep.accentSoft} px-1.5 py-0.5 rounded shrink-0`}>
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className={triggerClass}>
        <div className={`flex items-center justify-center shrink-0 rounded-md ${prep.accentSoft} ${
          compact ? 'w-8 h-8' : 'w-9 h-9 rounded-lg'
        }`}>
          <Briefcase className={`${prep.accentIcon} ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          {selectedJob ? (
            <>
              <p className="text-sm font-medium text-slate-800 truncate leading-tight">{selectedJob.jobTitle}</p>
              <p className="text-xs text-slate-600 truncate">{selectedJob.companyName || 'Company'}</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">{placeholder}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {selectedJob && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleClear(e);
              }}
              className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 ${prep.accentIcon} transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {dropdownPanel}
    </div>
  );
}
