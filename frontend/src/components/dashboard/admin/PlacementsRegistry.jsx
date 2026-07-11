import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Loader2,
  Search,
  Briefcase,
  Pencil,
  X,
  Building2,
  Calendar,
} from 'lucide-react';
import { fetchPlacements, updatePlacementCompensation } from '../../../services/placements';
import { useToast } from '../../ui/Toast';
import CustomDropdown from '../../common/CustomDropdown';

const PLACEMENT_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const EDIT_TYPE_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const SORT_OPTIONS = [
  { value: 'joined_desc', label: 'Joined (newest)' },
  { value: 'joined_asc', label: 'Joined (oldest)' },
];

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function typeLabel(type) {
  if (!type) return '—';
  if (type === 'FULL_TIME') return 'Full-time';
  if (type === 'INTERNSHIP') return 'Internship';
  return type.replace(/_/g, ' ');
}

function compensationDisplay(row) {
  if (row.placementType === 'INTERNSHIP') {
    return row.offerStipend ? { label: 'Stipend', value: row.offerStipend } : { label: 'Stipend', value: '—' };
  }
  if (row.placementType === 'FULL_TIME') {
    return row.offerCtc ? { label: 'CTC', value: row.offerCtc } : { label: 'CTC', value: '—' };
  }
  // Type not set — show whichever is present
  if (row.offerCtc) return { label: 'CTC', value: row.offerCtc };
  if (row.offerStipend) return { label: 'Stipend', value: row.offerStipend };
  return { label: 'Pay', value: '—' };
}

function EditPlacementModal({ row, onClose, onSaved }) {
  const toast = useToast();
  const [offerCtc, setOfferCtc] = useState(row?.offerCtc || '');
  const [offerStipend, setOfferStipend] = useState(row?.offerStipend || '');
  const [placementType, setPlacementType] = useState(row?.placementType || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const isInternship = placementType === 'INTERNSHIP';
      const isFullTime = placementType === 'FULL_TIME';
      await updatePlacementCompensation(row.applicationId, {
        placementType: placementType || null,
        // Clear the field that doesn't apply to this type
        offerCtc: isFullTime ? (offerCtc.trim() || null) : null,
        offerStipend: isInternship ? (offerStipend.trim() || null) : null,
      });
      toast.success('Placement updated');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Edit compensation</h3>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{row.studentName}</span>
            {' · '}
            {row.jobTitle}
          </p>
          <div>
            <CustomDropdown
              compact
              label="Type"
              options={EDIT_TYPE_OPTIONS}
              value={placementType}
              onChange={setPlacementType}
            />
          </div>
          {placementType === 'FULL_TIME' && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">CTC / Salary</label>
              <input
                type="text"
                value={offerCtc}
                onChange={(e) => setOfferCtc(e.target.value)}
                placeholder="e.g. 12 LPA"
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-800 focus:border-blue-800"
              />
            </div>
          )}
          {placementType === 'INTERNSHIP' && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stipend</label>
              <input
                type="text"
                value={offerStipend}
                onChange={(e) => setOfferStipend(e.target.value)}
                placeholder="e.g. ₹25,000/month"
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-800 focus:border-blue-800"
              />
            </div>
          )}
          {!placementType && (
            <p className="text-xs text-gray-500 rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2">
              Select a type to enter CTC (full-time) or stipend (internship).
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !placementType}
            className="px-4 py-2 text-sm font-medium bg-blue-800 text-white rounded-md hover:bg-blue-900 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlacementRow({ row, onEdit, onOpenJob, onOpenStudent }) {
  const pay = compensationDisplay(row);
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm">
        <button
          type="button"
          onClick={() => onOpenStudent?.(row)}
          className="font-medium text-gray-900 hover:text-blue-800 text-left"
        >
          {row.studentName}
        </button>
        <p className="text-xs text-gray-500 truncate max-w-[180px]">{row.studentEmail}</p>
      </td>
      <td className="px-4 py-3 text-sm">
        <button
          type="button"
          onClick={() => onOpenJob?.(row)}
          className="font-medium text-gray-900 hover:text-blue-800 text-left"
        >
          {row.jobTitle}
        </button>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Building2 className="w-3 h-3 shrink-0" />
          {row.companyName}
        </p>
      </td>
      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{typeLabel(row.placementType)}</td>
      <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
        <span className="text-gray-900">{pay.value}</span>
        {pay.value !== '—' && (
          <span className="block text-[10px] uppercase tracking-wide text-gray-400">{pay.label}</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(row.joinedAt)}</td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => onEdit(row)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
      </td>
    </tr>
  );
}

export default function PlacementsRegistry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [placements, setPlacements] = useState([]);
  const [total, setTotal] = useState(0);
  const [filterOptions, setFilterOptions] = useState({ schools: [], centers: [], batches: [] });
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [school, setSchool] = useState(searchParams.get('school') || '');
  const [center, setCenter] = useState(searchParams.get('center') || '');
  const [batch, setBatch] = useState(searchParams.get('batch') || '');
  const [placementType, setPlacementType] = useState(searchParams.get('placementType') || '');
  const [sortBy, setSortBy] = useState('joined_desc');
  const [editRow, setEditRow] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPlacements({
        search: search.trim() || undefined,
        school: school || undefined,
        center: center || undefined,
        batch: batch || undefined,
        placementType: placementType || undefined,
        jobId: searchParams.get('jobId') || undefined,
        studentId: searchParams.get('studentId') || undefined,
      });
      setPlacements(data.placements || []);
      setTotal(data.total ?? 0);
      setFilterOptions(data.filters || { schools: [], centers: [], batches: [] });
    } catch (e) {
      toast.error(e?.message || 'Failed to load placements');
      setPlacements([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, school, center, batch, placementType, searchParams, toast]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const sortedPlacements = useMemo(() => {
    const rows = [...placements];
    const byDate = (a, b) => {
      const ta = a ? new Date(a).getTime() : 0;
      const tb = b ? new Date(b).getTime() : 0;
      return ta - tb;
    };

    rows.sort((a, b) =>
      sortBy === 'joined_asc'
        ? byDate(a.joinedAt, b.joinedAt)
        : byDate(b.joinedAt, a.joinedAt)
    );
    return rows;
  }, [placements, sortBy]);

  const schoolOptions = useMemo(
    () => [{ value: '', label: 'All schools' }, ...(filterOptions.schools || []).map((s) => ({ value: s, label: s }))],
    [filterOptions.schools]
  );
  const centerOptions = useMemo(
    () => [{ value: '', label: 'All centers' }, ...(filterOptions.centers || []).map((c) => ({ value: c, label: c }))],
    [filterOptions.centers]
  );
  const batchOptions = useMemo(
    () => [{ value: '', label: 'All batches' }, ...(filterOptions.batches || []).map((b) => ({ value: b, label: b }))],
    [filterOptions.batches]
  );

  const openJob = (row) => navigate(`${base}/job/${row.jobId}`);
  const openStudent = (row) => navigate(`${base}?tab=studentDirectory&studentId=${row.studentId}`);

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-[1600px] mx-auto overflow-x-hidden">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-800" />
            <div>
              <h2 className="font-semibold text-gray-900">
                Placement Records
                {!loading && (
                  <span className="ml-2 text-sm font-medium text-gray-500">({total})</span>
                )}
              </h2>
              <p className="text-xs text-gray-500">Students marked JOINED — edit CTC and stipend anytime</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-52">
              <CustomDropdown
                compact
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={setSortBy}
                placeholder="Sort by"
              />
            </div>
            {loading && (
              <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin text-blue-800" />
                Loading…
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="relative lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Student name or email…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-800 focus:border-blue-800"
              />
            </div>
          </div>
          <CustomDropdown
            compact
            label="School"
            options={schoolOptions}
            value={school}
            onChange={setSchool}
          />
          <CustomDropdown
            compact
            label="Center"
            options={centerOptions}
            value={center}
            onChange={setCenter}
          />
          <CustomDropdown
            compact
            label="Batch"
            options={batchOptions}
            value={batch}
            onChange={setBatch}
          />
          <CustomDropdown
            compact
            label="Type"
            options={PLACEMENT_TYPE_OPTIONS}
            value={placementType}
            onChange={setPlacementType}
          />
        </div>

        {loading && placements.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-800 animate-spin" />
          </div>
        ) : sortedPlacements.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium text-sm">No joined placements yet</p>
            <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">
              Mark a student as <strong>JOINED</strong> from Applicants → application detail. They will appear here for compensation tracking.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="text-left text-[10px] font-medium uppercase tracking-wider text-gray-500 border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-2">Student</th>
                  <th className="px-4 py-2">Job</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Compensation</th>
                  <th className="px-4 py-2">Joined</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedPlacements.map((row) => (
                  <PlacementRow
                    key={row.applicationId}
                    row={row}
                    onEdit={setEditRow}
                    onOpenJob={openJob}
                    onOpenStudent={openStudent}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editRow && (
        <EditPlacementModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
