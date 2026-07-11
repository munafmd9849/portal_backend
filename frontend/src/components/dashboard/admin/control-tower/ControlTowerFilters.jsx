import React from 'react';
import CustomDropdown from '../../../common/CustomDropdown';

const EMPTY = {
  programs: [],
  cohorts: [],
  centers: [],
  quarters: [],
  months: [],
  crManagers: [],
};

export default function ControlTowerFilters({ filterOptions, filters, onChange, onApply }) {
  const opts = filterOptions || EMPTY;
  const programOptions = [{ value: '', label: 'Program / Specialization' }, ...opts.programs.map((p) => ({ value: p.id, label: p.name }))];
  const cohortOptions = [{ value: '', label: 'Cohort' }, ...opts.cohorts.map((c) => ({ value: c.id, label: c.name }))];
  const quarterOptions = [{ value: '', label: 'Select Quarter' }, ...opts.quarters.map((q) => ({ value: q.id, label: q.name }))];
  const monthOptions = [{ value: '', label: 'Select Month' }, ...opts.months.map((m) => ({ value: m.id, label: m.name }))];
  const crOptions = [{ value: '', label: 'CR Manager' }, ...opts.crManagers.map((m) => ({ value: m.id, label: m.name }))];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
        <CustomDropdown
          label="Program/Specialization"
          options={programOptions}
          value={filters.program || ''}
          onChange={(v) => onChange({ ...filters, program: v, school: v })}
        />
        <CustomDropdown
          label="Cohort"
          options={cohortOptions}
          value={filters.cohort || ''}
          onChange={(v) => onChange({ ...filters, cohort: v, batch: v })}
        />
        <CustomDropdown
          label="Quarter"
          options={quarterOptions}
          value={filters.quarter || ''}
          onChange={(v) => onChange({ ...filters, quarter: v })}
        />
        <CustomDropdown
          label="Month"
          options={monthOptions}
          value={filters.month || ''}
          onChange={(v) => onChange({ ...filters, month: v })}
        />
        <CustomDropdown
          label="CR Manager"
          options={crOptions}
          value={filters.crManager || ''}
          onChange={(v) => onChange({ ...filters, crManager: v })}
        />
        <div className="sm:col-span-2 xl:col-span-2 min-w-0">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
          <div className="grid grid-cols-2 gap-3 min-w-0">
            <input
              type="date"
              value={filters.from || ''}
              onChange={(e) => onChange({ ...filters, from: e.target.value })}
              className="min-w-0 w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="date"
              value={filters.to || ''}
              onChange={(e) => onChange({ ...filters, to: e.target.value })}
              className="min-w-0 w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="min-w-0">
          <label className="block text-sm font-semibold text-gray-700 mb-2 invisible select-none" aria-hidden>
            Apply
          </label>
          <button
            type="button"
            onClick={onApply}
            className="w-full border-2 border-indigo-600 rounded-lg px-4 py-3 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}
