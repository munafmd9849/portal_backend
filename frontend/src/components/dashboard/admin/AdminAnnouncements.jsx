/**
 * Admin Announcements — compose + history tabs (Manage Jobs pattern).
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../../services/api';
import {
  Send,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  CheckCircle,
  Calendar,
  ExternalLink,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  MapPin,
  Megaphone,
} from 'lucide-react';

const HISTORY_PER_PAGE = 8;

function formatAudience(a) {
  const parts = [];
  const parse = (raw) => {
    if (raw == null || raw === '') return null;
    try {
      const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(v) && v.length) return v;
    } catch {
      if (typeof raw === 'string' && raw.trim()) return [raw];
    }
    return null;
  };
  const schools = parse(a.targetSchools);
  const batches = parse(a.targetBatches);
  const centers = parse(a.targetCenters);
  if (schools?.includes('ALL') || (!schools && !batches && !centers)) {
    return 'All students';
  }
  if (schools?.length) parts.push(schools.filter((x) => x !== 'ALL').join(', ') || 'All schools');
  if (batches?.length) parts.push(batches.filter((x) => x !== 'ALL').join(', ') || 'All batches');
  if (centers?.length) parts.push(centers.filter((x) => x !== 'ALL').join(', ') || 'All centres');
  return parts.length ? parts.join(' · ') : 'All students';
}

function isTargeted(a) {
  const has = (raw) => {
    if (raw == null || raw === '') return false;
    try {
      const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(v) ? v.length > 0 && !(v.length === 1 && v[0] === 'ALL') : Boolean(raw);
    } catch {
      return Boolean(raw);
    }
  };
  return has(a.targetSchools) || has(a.targetBatches) || has(a.targetCenters);
}

export default function AdminAnnouncements() {
  const [activeTab, setActiveTab] = useState('compose'); // compose | history
  const [historyFilter, setHistoryFilter] = useState('all'); // all | targeted | broadcast
  const [historyPage, setHistoryPage] = useState(1);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [targetSchools, setTargetSchools] = useState([]);
  const [targetBatches, setTargetBatches] = useState([]);
  const [targetCenters, setTargetCenters] = useState([]);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [showCenterDropdown, setShowCenterDropdown] = useState(false);
  const schoolDropdownRef = useRef(null);
  const batchDropdownRef = useRef(null);
  const centerDropdownRef = useRef(null);

  const [academicOptions, setAcademicOptions] = useState({
    schools: [],
    batches: [],
    centers: [],
  });

  const SCHOOL_OPTIONS = [{ id: 'ALL', label: 'All Branches' }, ...academicOptions.schools.map((s) => ({ id: s.name, label: s.name }))];
  const BATCH_OPTIONS = [{ id: 'ALL', label: 'All Batches' }, ...academicOptions.batches.map((b) => ({ id: b.year, label: b.year }))];
  const CENTER_OPTIONS = [{ id: 'ALL', label: 'All Campuses' }, ...academicOptions.centers.map((c) => ({ id: c.name, label: c.name }))];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        schoolDropdownRef.current && !schoolDropdownRef.current.contains(e.target) &&
        batchDropdownRef.current && !batchDropdownRef.current.contains(e.target) &&
        centerDropdownRef.current && !centerDropdownRef.current.contains(e.target)
      ) {
        setShowSchoolDropdown(false);
        setShowBatchDropdown(false);
        setShowCenterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFilter = (setter, id) => {
    setter((prev) => {
      if (id === 'ALL') return prev.includes('ALL') ? [] : ['ALL'];
      const next = prev.filter((x) => x !== 'ALL');
      if (next.includes(id)) return next.length === 1 ? [] : next.filter((x) => x !== id);
      return [...next, id];
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingList(true);
        const [annRes, s, c, b] = await Promise.all([
          api.getAnnouncements(),
          api.getSchools(),
          api.getCenters(),
          api.getBatches(),
        ]);
        setList(annRes?.announcements || []);
        const { filterActiveAcademicRecords } = await import('../../../utils/academicOptions');
        setAcademicOptions({
          schools: filterActiveAcademicRecords(s),
          centers: filterActiveAcademicRecords(c),
          batches: filterActiveAcademicRecords(b),
        });
      } catch (e) {
        console.error('Failed to load data for announcements:', e);
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyFilter]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'targeted') return list.filter(isTargeted);
    if (historyFilter === 'broadcast') return list.filter((a) => !isTargeted(a));
    return list;
  }, [list, historyFilter]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PER_PAGE));
  const historyPageSafe = Math.min(historyPage, historyTotalPages);
  const paginatedHistory = filteredHistory.slice(
    (historyPageSafe - 1) * HISTORY_PER_PAGE,
    historyPageSafe * HISTORY_PER_PAGE,
  );

  const targetedCount = useMemo(() => list.filter(isTargeted).length, [list]);
  const broadcastCount = list.length - targetedCount;

  const onImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image (JPG, PNG, or WebP)');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('Image must be under 3MB');
      return;
    }
    setError('');
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }
    if (!trimmedDesc) {
      setError('Description is required');
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('title', trimmedTitle);
      formData.append('description', trimmedDesc);
      if (link.trim()) formData.append('link', link.trim());
      if (imageFile) formData.append('image', imageFile);
      if (targetSchools.length) formData.append('targetSchools', JSON.stringify(targetSchools));
      if (targetBatches.length) formData.append('targetBatches', JSON.stringify(targetBatches));
      if (targetCenters.length) formData.append('targetCenters', JSON.stringify(targetCenters));

      const res = await api.createAnnouncement(formData);
      setSuccess(
        `Announcement sent. ${res.emailsSent || 0} students notified${res.emailsFailed ? ` (${res.emailsFailed} failed)` : ''}.`,
      );
      setTitle('');
      setDescription('');
      setLink('');
      setImageFile(null);
      setImagePreview(null);
      setTargetSchools([]);
      setTargetBatches([]);
      setTargetCenters([]);
      setList((prev) => [res.announcement, ...prev]);
      setHistoryFilter('all');
      setHistoryPage(1);
      setActiveTab('history');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to send announcement';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const filterDropdown = (label, Icon, options, selected, setter, show, setShow, ref, otherSetters) => (
    <div className="flex-1 min-w-[140px] max-w-[200px]">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="relative" ref={ref}>
        <button
          type="button"
          className={`w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-left flex items-center justify-between bg-white hover:border-sky-300 ${
            selected.length ? 'border-sky-300 ring-1 ring-sky-100' : ''
          }`}
          onClick={() => {
            setShow((v) => !v);
            otherSetters.forEach((fn) => fn(false));
          }}
        >
          <span className="truncate text-gray-700">
            {selected.length
              ? selected.map((id) => options.find((o) => o.id === id)?.label || id).join(', ')
              : `Select ${label}`}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
        </button>
        {show && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-36 overflow-y-auto">
            {options.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-sky-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.id)}
                  onChange={() => toggleFilter(setter, opt.id)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div
          className="inline-flex rounded-md border border-gray-200 bg-white p-0.5 shadow-sm"
          role="tablist"
          aria-label="Announcements"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'compose'}
            onClick={() => setActiveTab('compose')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'compose'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Compose
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            History ({list.length})
          </button>
        </div>
      </div>

      {activeTab === 'compose' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-gray-100">
              {filterDropdown(
                'School',
                GraduationCap,
                SCHOOL_OPTIONS,
                targetSchools,
                setTargetSchools,
                showSchoolDropdown,
                setShowSchoolDropdown,
                schoolDropdownRef,
                [setShowBatchDropdown, setShowCenterDropdown],
              )}
              {filterDropdown(
                'Batch',
                Users,
                BATCH_OPTIONS,
                targetBatches,
                setTargetBatches,
                showBatchDropdown,
                setShowBatchDropdown,
                batchDropdownRef,
                [setShowSchoolDropdown, setShowCenterDropdown],
              )}
              {filterDropdown(
                'Center',
                MapPin,
                CENTER_OPTIONS,
                targetCenters,
                setTargetCenters,
                showCenterDropdown,
                setShowCenterDropdown,
                centerDropdownRef,
                [setShowSchoolDropdown, setShowBatchDropdown],
              )}
              <span
                className="inline-flex items-center shrink-0 px-3 py-2 rounded-md text-xs font-medium border border-gray-200 bg-gray-50 text-gray-600"
                title="No filters selected sends to all students"
              >
                No selection = all students
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title"
                className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-sky-400 focus:border-sky-400 text-sm outline-none"
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter announcement details"
                className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-sky-400 focus:border-sky-400 text-sm min-h-[120px] resize-y outline-none"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <LinkIcon className="w-4 h-4 inline mr-1 text-gray-500" />
                  Link (optional)
                </label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://"
                  className="w-full px-3 py-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-sky-400 focus:border-sky-400 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <ImagePlus className="w-4 h-4 inline mr-1 text-gray-500" />
                  Image (optional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onImageChange}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-200 file:bg-white file:text-gray-700 file:font-medium file:cursor-pointer hover:file:bg-gray-50"
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mt-2 rounded-md border border-gray-200 max-h-32 object-cover"
                  />
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-md text-sm font-medium bg-rose-50 text-rose-800 border border-rose-100">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-md flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-100 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send announcement
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          <div
            className="inline-flex rounded-md border border-gray-200 bg-white p-0.5 shadow-sm"
            role="tablist"
            aria-label="History filter"
          >
            <button
              type="button"
              role="tab"
              aria-selected={historyFilter === 'all'}
              onClick={() => setHistoryFilter('all')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                historyFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              All ({list.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={historyFilter === 'broadcast'}
              onClick={() => setHistoryFilter('broadcast')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                historyFilter === 'broadcast'
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Broadcast ({broadcastCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={historyFilter === 'targeted'}
              onClick={() => setHistoryFilter('targeted')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                historyFilter === 'targeted'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Targeted ({targetedCount})
            </button>
          </div>

          {loadingList ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-sky-600" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white rounded-lg border border-dashed border-gray-200 p-12 text-center">
              <Megaphone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">
                {historyFilter === 'all'
                  ? 'No announcements yet'
                  : historyFilter === 'targeted'
                    ? 'No targeted announcements'
                    : 'No broadcast announcements'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {historyFilter === 'all'
                  ? 'Sent announcements will appear here.'
                  : 'Try another filter or compose a new one.'}
              </p>
              {historyFilter === 'all' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('compose')}
                  className="mt-4 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Compose announcement
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                {paginatedHistory.map((a) => {
                  const targeted = isTargeted(a);
                  return (
                    <div
                      key={a.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:border-sky-200 transition-colors"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs font-medium border ${
                                targeted
                                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                                  : 'bg-sky-50 text-sky-700 border-sky-100'
                              }`}
                            >
                              {targeted ? 'Targeted' : 'Broadcast'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(a.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{a.title}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.description}</p>
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 shrink-0" />
                            {formatAudience(a)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {a.imageUrl && (
                            <img
                              src={a.imageUrl}
                              alt=""
                              className="w-12 h-12 rounded-md object-cover border border-gray-200"
                            />
                          )}
                          {a.link && (
                            <a
                              href={a.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Link
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredHistory.length > HISTORY_PER_PAGE && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <p className="text-xs text-gray-500">
                    {(historyPageSafe - 1) * HISTORY_PER_PAGE + 1}–
                    {Math.min(historyPageSafe * HISTORY_PER_PAGE, filteredHistory.length)} of {filteredHistory.length}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPageSafe <= 1}
                      className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-600 disabled:opacity-30 hover:bg-gray-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-600 px-2 tabular-nums">
                      {historyPageSafe} / {historyTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                      disabled={historyPageSafe >= historyTotalPages}
                      className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-600 disabled:opacity-30 hover:bg-gray-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
