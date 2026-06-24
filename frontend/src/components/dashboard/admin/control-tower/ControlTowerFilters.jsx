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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
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
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
          <div className="flex gap-1">
            <input
              type="date"
              value={filters.from || ''}
              onChange={(e) => onChange({ ...filters, from: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-2 py-2 text-xs"
            />
            <input
              type="date"
              value={filters.to || ''}
              onChange={(e) => onChange({ ...filters, to: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-2 py-2 text-xs"
            />
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onApply}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700"
        >
          Apply filters
        </button>
      </div>
    </div>
  );
}
