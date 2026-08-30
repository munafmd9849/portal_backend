import React, { useState } from 'react';
import JobPickerDropdown from './JobPickerDropdown';
import { prepFieldClass, prepSegmentBtnClass, prepSegmentTrackClass } from '../dashboard/student/interviewPrep/PrepSegments';

const MODES = [
  { id: 'portal', label: 'Job Portal' },
  { id: 'custom', label: 'Any role' },
];

export default function RoleTargetPicker({ value, onChange, className = '' }) {
  const [mode, setMode] = useState(value?.source || 'portal');
  const [customRole, setCustomRole] = useState(value?.source === 'custom' ? (value.jobTitle || '') : '');
  const [customCompany, setCustomCompany] = useState(value?.source === 'custom' ? (value.companyName || '') : '');
  const [customJd, setCustomJd] = useState(value?.source === 'custom' ? (value.jobDescription || '') : '');

  const emitPortal = (job) => {
    if (!job) {
      onChange(null);
      return;
    }
    onChange({
      source: 'portal',
      id: job.id,
      jobTitle: job.jobTitle,
      companyName: job.companyName || 'Company',
      jobDescription: job.description || job.jobDescription || '',
    });
  };

  const emitCustom = (role, company, jd) => {
    const title = role.trim();
    if (!title) {
      onChange(null);
      return;
    }
    onChange({
      source: 'custom',
      jobTitle: title,
      companyName: company.trim() || 'General',
      jobDescription: jd.trim(),
    });
  };

  const switchMode = (next) => {
    setMode(next);
    onChange(null);
    if (next === 'portal') {
      setCustomRole('');
      setCustomCompany('');
      setCustomJd('');
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className={`w-full sm:w-auto ${prepSegmentTrackClass}`}>
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchMode(id)}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${prepSegmentBtnClass(mode === id)}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'portal' ? (
        <JobPickerDropdown
          selectedJob={value?.source === 'portal' ? value : null}
          onSelect={emitPortal}
          placeholder="Choose a role from job portal"
          compact
          prefetch
        />
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={customRole}
            onChange={(e) => {
              const v = e.target.value;
              setCustomRole(v);
              emitCustom(v, customCompany, customJd);
            }}
            placeholder="Role title"
            className={prepFieldClass}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={customCompany}
              onChange={(e) => {
                const v = e.target.value;
                setCustomCompany(v);
                emitCustom(customRole, v, customJd);
              }}
              placeholder="Company (optional)"
              className={prepFieldClass}
            />
            <input
              type="text"
              value={customJd}
              onChange={(e) => {
                const v = e.target.value;
                setCustomJd(v);
                emitCustom(customRole, customCompany, v);
              }}
              placeholder="JD keywords (optional)"
              className={prepFieldClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}
