import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  GraduationCap,
  MapPin,
  Users,
  ChevronDown,
  Search,
} from 'lucide-react';
import { au } from '../assessment/assessmentUi';

function AudienceMultiSelect({
  label,
  icon: Icon,
  options,
  selectedIds,
  onToggle,
  isOpen,
  onOpenChange,
  searchable = false,
  emptyText = 'Nothing to show',
}) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [search, setSearch] = useState('');
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      return undefined;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(rect.width, 220);
      let left = rect.left;
      if (left + width > window.innerWidth - 8) {
        left = window.innerWidth - width - 8;
      }
      left = Math.max(8, left);

      const spaceBelow = window.innerHeight - rect.bottom;
      const panelHeight = searchable ? 280 : 240;
      const top =
        spaceBelow >= panelHeight + 8
          ? rect.bottom + 4
          : Math.max(8, rect.top - panelHeight - 4);

      setPanelStyle({ top, left, width, maxHeight: panelHeight });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, searchable]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        panelRef.current?.contains(e.target)
      ) {
        return;
      }
      onOpenChange(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onOpenChange]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const summary =
    selectedIds.length === 0
      ? `All ${label.toLowerCase()}`
      : selectedIds.length === 1
        ? options.find((o) => o.id === selectedIds[0])?.label || '1 selected'
        : `${selectedIds.length} selected`;

  const panel =
    isOpen &&
    createPortal(
      <div
        ref={panelRef}
        role="listbox"
        aria-label={label}
        className="fixed z-[10050] bg-white border border-slate-200 rounded-lg shadow-lg flex flex-col overflow-hidden"
        style={panelStyle}
      >
        {searchable && (
          <div className="p-2 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                autoFocus
              />
            </div>
          </div>
        )}
        <div className="overflow-y-auto flex-1 min-h-0 custom-scrollbar">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-xs text-slate-500 text-center">{emptyText}</p>
          ) : (
            filtered.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(opt.id)}
                  onChange={() => onToggle(opt.id)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                />
                <span className="text-slate-700 truncate">{opt.label}</span>
              </label>
            ))
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <div className="space-y-1.5 min-w-0">
      <span className={au.label}>{label}</span>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => onOpenChange(!isOpen)}
        className={`${au.wizardInput} flex items-center justify-between gap-2 text-left py-2 ${
          isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-500' : ''
        } ${selectedIds.length ? 'text-slate-900' : ''}`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          <Icon className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
          <span className={`truncate text-sm ${selectedIds.length ? 'text-slate-900' : 'text-slate-500'}`}>
            {summary}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {panel}
    </div>
  );
}

export default function AssessmentAudiencePicker({
  schools = [],
  centers = [],
  batches = [],
  students = [],
  targetSchoolIds = [],
  targetCenterIds = [],
  targetBatchIds = [],
  targetStudentIds = [],
  onSchoolToggle,
  onCenterToggle,
  onBatchToggle,
  onStudentToggle,
  onClearAll,
  loading = false,
}) {
  const [openDropdown, setOpenDropdown] = useState(null);

  const schoolOptions = useMemo(
    () => schools.map((s) => ({ id: s.id, label: s.name })),
    [schools]
  );
  const centerOptions = useMemo(
    () => centers.map((c) => ({ id: c.id, label: c.name })),
    [centers]
  );
  const batchOptions = useMemo(
    () => batches.map((b) => ({ id: b.id, label: b.label || b.year })),
    [batches]
  );
  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        id: s.userId || s.id,
        label: s.fullName || s.email || 'Student',
      })),
    [students]
  );

  const totalSelected =
    targetSchoolIds.length +
    targetCenterIds.length +
    targetBatchIds.length +
    targetStudentIds.length;

  if (loading) {
    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Who should take this?</h3>
          <p className="text-sm text-slate-600 mt-0.5">Loading audience options…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Who should take this?</h3>
          <p className="text-sm text-slate-600 mt-0.5">
            Narrow by school, center, batch, or individual students. Empty = everyone.
          </p>
        </div>
        {totalSelected > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 shrink-0"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AudienceMultiSelect
          label="School"
          icon={Building2}
          options={schoolOptions}
          selectedIds={targetSchoolIds}
          onToggle={onSchoolToggle}
          isOpen={openDropdown === 'school'}
          onOpenChange={(open) => setOpenDropdown(open ? 'school' : null)}
          emptyText="No schools configured"
        />
        <AudienceMultiSelect
          label="Center"
          icon={MapPin}
          options={centerOptions}
          selectedIds={targetCenterIds}
          onToggle={onCenterToggle}
          isOpen={openDropdown === 'center'}
          onOpenChange={(open) => setOpenDropdown(open ? 'center' : null)}
          emptyText="No centers configured"
        />
        <AudienceMultiSelect
          label="Batch"
          icon={GraduationCap}
          options={batchOptions}
          selectedIds={targetBatchIds}
          onToggle={onBatchToggle}
          isOpen={openDropdown === 'batch'}
          onOpenChange={(open) => setOpenDropdown(open ? 'batch' : null)}
          emptyText="No batches configured"
        />
        <AudienceMultiSelect
          label="Students"
          icon={Users}
          options={studentOptions}
          selectedIds={targetStudentIds}
          onToggle={onStudentToggle}
          isOpen={openDropdown === 'students'}
          onOpenChange={(open) => setOpenDropdown(open ? 'students' : null)}
          searchable
          emptyText="No students found"
        />
      </div>
    </div>
  );
}
