/**
 * Super-admin Landing CMS — sections, publish, versions, media.
 * Visual vocabulary matches SuccessStoriesManager / admin content tools.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Upload,
  Eye,
  EyeOff,
  History,
  ImagePlus,
  RefreshCw,
  X,
} from 'lucide-react';
import { LoadingPage, SkeletonMediaRowList, Spinner } from '../../ui/loading';
import CustomDropdown from '../../common/CustomDropdown';
import {
  listSections,
  upsertSection,
  setSectionStatus,
  deleteSection,
  reorderSections,
  publishPage,
  listVersions,
  restoreVersion,
  uploadCmsMedia,
  getPublicLanding,
} from '../../../services/cms';

const SECTION_KEYS = [
  'HERO',
  'STATS',
  'PARTNER_LOGO',
  'FEATURED_COMPANY',
  'TESTIMONIAL',
  'FAQ',
  'FOOTER',
  'CONTACT',
  'CTA',
  'EVENT',
  'ANNOUNCEMENT',
  'ALUMNI',
  'SUCCESS_HIGHLIGHT',
];

const SECTION_LABELS = {
  HERO: 'Hero',
  STATS: 'Stats',
  PARTNER_LOGO: 'Partner logos',
  FEATURED_COMPANY: 'Featured company',
  TESTIMONIAL: 'Testimonial',
  FAQ: 'FAQ',
  FOOTER: 'Footer',
  CONTACT: 'Contact',
  CTA: 'CTA',
  EVENT: 'Event',
  ANNOUNCEMENT: 'Announcement',
  ALUMNI: 'Alumni',
  SUCCESS_HIGHLIGHT: 'Success highlight',
};

const SECTION_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All sections' },
  ...SECTION_KEYS.map((key) => ({ value: key, label: SECTION_LABELS[key] || key })),
];

const SECTION_TYPE_OPTIONS = SECTION_KEYS.map((key) => ({
  value: key,
  label: SECTION_LABELS[key] || key,
}));

const STATUS_FORM_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const EMPTY_FORM = {
  id: null,
  sectionKey: 'HERO',
  title: '',
  subtitle: '',
  body: '',
  ctaLabel: '',
  ctaUrl: '',
  mediaUrl: '',
  mediaPublicId: '',
  mediaType: '',
  status: 'DRAFT',
  sortOrder: 0,
};

const inputClass = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500';
const iconBtnClass = 'p-2 rounded-md border border-slate-200 hover:bg-white text-slate-600';

function sectionLabel(key) {
  return SECTION_LABELS[key] || String(key || '').replace(/_/g, ' ');
}

function statusBadge(status) {
  const map = {
    DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
    PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ARCHIVED: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[status] || map.DRAFT;
}

export default function LandingCmsManager() {
  const [sections, setSections] = useState([]);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterKey, setFilterKey] = useState('ALL');
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [secRes, verRes] = await Promise.all([
        listSections({ page: 'landing', includeArchived: 'true' }),
        listVersions('landing'),
      ]);
      setSections(secRes?.sections || []);
      setVersions(verRes?.versions || []);
    } catch (e) {
      setError(e?.message || 'Failed to load CMS data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filterKey === 'ALL') return sections;
    return sections.filter((s) => s.sectionKey === filterKey);
  }, [sections, filterKey]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, sortOrder: sections.length });
    setShowForm(true);
  };

  const openEdit = (section) => {
    setForm({
      id: section.id,
      sectionKey: section.sectionKey || 'HERO',
      title: section.title || '',
      subtitle: section.subtitle || '',
      body: section.body || '',
      ctaLabel: section.ctaLabel || '',
      ctaUrl: section.ctaUrl || '',
      mediaUrl: section.mediaUrl || '',
      mediaPublicId: section.mediaPublicId || '',
      mediaType: section.mediaType || '',
      status: section.status || 'DRAFT',
      sortOrder: section.sortOrder ?? 0,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setActionMsg('');
    setError('');
    try {
      await upsertSection({
        ...form,
        pageSlug: 'landing',
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setActionMsg(form.id ? 'Section updated' : 'Section created');
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await setSectionStatus(id, status);
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this section?')) return;
    try {
      await deleteSection(id);
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to delete');
    }
  };

  const moveSection = async (index, direction) => {
    const ordered = [...filtered];
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const fullOrder = sections.map((s) => s.id);
    const filteredIds = ordered.map((s) => s.id);
    let fi = 0;
    const nextIds = fullOrder.map((id) => {
      if (filteredIds.includes(id)) return filteredIds[fi++];
      return id;
    });
    try {
      await reorderSections(nextIds);
      await load();
    } catch (err) {
      setError(err?.message || 'Reorder failed');
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    setActionMsg('');
    setError('');
    try {
      const result = await publishPage({
        pageSlug: 'landing',
        label: `Publish ${new Date().toLocaleString()}`,
      });
      setActionMsg(`Published v${result?.version ?? ''} (${result?.publishedCount ?? 0} sections)`);
      await load();
    } catch (err) {
      setError(err?.message || 'Publish failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (version) => {
    if (!window.confirm(`Restore version ${version}? Current drafts will be overwritten.`)) return;
    setSaving(true);
    setError('');
    try {
      await restoreVersion(version, 'landing');
      setActionMsg(`Restored version ${version}`);
      await load();
    } catch (err) {
      setError(err?.message || 'Restore failed');
    } finally {
      setSaving(false);
    }
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const data = await uploadCmsMedia(file);
      setForm((prev) => ({
        ...prev,
        mediaUrl: data.url || '',
        mediaPublicId: data.publicId || '',
        mediaType: data.mediaType || 'IMAGE',
      }));
    } catch (err) {
      setError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const togglePreview = async () => {
    if (previewMode) {
      setPreviewMode(false);
      return;
    }
    try {
      const data = await getPublicLanding('landing');
      setPreviewData(data);
      setPreviewMode(true);
    } catch (err) {
      setError(err?.message || 'Failed to load published preview');
    }
  };

  if (loading) {
    return <LoadingPage title="Loading CMS…" />;
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-[1200px] mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Landing Page</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Edit public sections, then publish. Restore from version history if needed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={togglePreview}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
          >
            {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {previewMode ? 'Hide preview' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? <Spinner size="sm" /> : <Upload className="w-4 h-4" />}
            Publish
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            New section
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <CustomDropdown
            label="Section type"
            compact
            options={SECTION_FILTER_OPTIONS}
            value={filterKey}
            onChange={setFilterKey}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-start justify-between gap-3">
          <span>{error}</span>
          <button type="button" className="text-rose-600 hover:underline shrink-0" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}
      {actionMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-start justify-between gap-3">
          <span>{actionMsg}</span>
          <button type="button" className="text-emerald-700 hover:underline shrink-0" onClick={() => setActionMsg('')}>
            Dismiss
          </button>
        </div>
      )}

      {previewMode && previewData && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Published snapshot
              <span className="text-slate-400 font-normal ml-1">
                v{previewData.version ?? '—'} · {previewData.sections?.length || 0} sections
              </span>
            </h2>
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <pre className="text-xs text-slate-600 overflow-auto max-h-56 p-4 bg-slate-50 font-mono leading-relaxed">
            {JSON.stringify(previewData, null, 2)}
          </pre>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Sections{' '}
            <span className="text-slate-400 font-normal">({filtered.length})</span>
          </h2>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center py-14 text-sm text-slate-500">
            No sections yet. Create a hero, stats, or FAQ block, then publish the page.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((section, idx) => (
              <li
                key={section.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 hover:bg-slate-50/80"
              >
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveSection(idx, -1)}
                    className={iconBtnClass}
                    title="Move up"
                    disabled={idx === 0}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(idx, 1)}
                    className={iconBtnClass}
                    title="Move down"
                    disabled={idx === filtered.length - 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {section.mediaUrl && section.mediaType !== 'VIDEO' ? (
                  <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                    <img src={section.mediaUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                    <ImagePlus className="w-5 h-5 text-slate-300" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {section.title || '(untitled)'}
                    </p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusBadge(section.status)}`}>
                      {section.status}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                      {sectionLabel(section.sectionKey)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {section.subtitle || section.body || 'No details yet'}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    title={section.status === 'PUBLISHED' ? 'Move to draft' : 'Publish section'}
                    onClick={() =>
                      handleStatus(section.id, section.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')
                    }
                    className={iconBtnClass}
                  >
                    {section.status === 'PUBLISHED' ? (
                      <EyeOff className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-emerald-600" />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => openEdit(section)}
                    className={iconBtnClass}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => handleDelete(section.id)}
                    className={iconBtnClass}
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Version history</h2>
        </div>
        {versions.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No published versions yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {versions.map((v) => (
              <li key={v.id || v.version} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    v{v.version}
                    {v.label ? ` — ${v.label}` : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestore(v.version)}
                  disabled={saving}
                  className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-xl sm:rounded-xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {form.id ? 'Edit section' : 'New section'}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-md hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CustomDropdown
                  label="Section type"
                  compact
                  options={SECTION_TYPE_OPTIONS}
                  value={form.sectionKey}
                  onChange={(v) => setForm((p) => ({ ...p, sectionKey: v }))}
                />
                <CustomDropdown
                  label="Status"
                  compact
                  options={STATUS_FORM_OPTIONS}
                  value={form.status}
                  onChange={(v) => setForm((p) => ({ ...p, status: v }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Section headline"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Subtitle</label>
                <input
                  className={inputClass}
                  value={form.subtitle}
                  onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Body</label>
                <textarea
                  rows={4}
                  className={inputClass}
                  value={form.body}
                  onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CTA label</label>
                  <input
                    className={inputClass}
                    value={form.ctaLabel}
                    onChange={(e) => setForm((p) => ({ ...p, ctaLabel: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CTA URL</label>
                  <input
                    className={inputClass}
                    value={form.ctaUrl}
                    onChange={(e) => setForm((p) => ({ ...p, ctaUrl: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Media</label>
                {form.mediaUrl && form.mediaType !== 'VIDEO' && (
                  <div className="mb-2 w-20 h-20 rounded-md overflow-hidden border border-slate-200">
                    <img src={form.mediaUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                {form.mediaUrl && (
                  <p className="text-xs text-slate-500 truncate mb-2" title={form.mediaUrl}>
                    {form.mediaUrl}
                  </p>
                )}
                <label className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  {uploading ? <Spinner size="sm" /> : <Upload className="w-4 h-4" />}
                  Upload image
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    className="hidden"
                    onChange={handleMediaUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving && <Spinner size="sm" />}
                Save section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
