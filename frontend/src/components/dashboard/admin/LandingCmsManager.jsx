/**
 * Super-admin Landing CMS manager — sections, publish, versions, media.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Upload,
  Eye,
  EyeOff,
  History,
  Megaphone,
  ImagePlus,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setActionMsg('');
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
    try {
      const result = await publishPage({ pageSlug: 'landing', label: `Publish ${new Date().toLocaleString()}` });
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
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-slate-600 text-sm">Loading CMS…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-600" />
            Landing Page
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Control landing page sections (hero, stats, partner logos, FAQs, CTAs). Publish when ready; restore from version history if needed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={togglePreview}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {previewMode ? 'Exit preview' : 'Preview published'}
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Publish Page
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" />
            New section
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
          <button type="button" className="ml-auto text-rose-500 hover:underline" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}
      {actionMsg && (
        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">{actionMsg}</div>
      )}

      {previewMode && previewData && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <p className="text-sm font-medium text-indigo-800 mb-2">
            Published preview — v{previewData.version ?? '—'} ({previewData.sections?.length || 0} sections)
          </p>
          <pre className="text-xs text-slate-700 overflow-auto max-h-64 bg-white rounded-lg border border-slate-200 p-3">
            {JSON.stringify(previewData, null, 2)}
          </pre>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterKey('ALL')}
          className={`px-2.5 py-1 text-xs rounded-md border ${
            filterKey === 'ALL'
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All
        </button>
        {SECTION_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterKey(key)}
            className={`px-2.5 py-1 text-xs rounded-md border ${
              filterKey === key
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {key.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{form.id ? 'Edit section' : 'Create section'}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 hover:text-slate-800">
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="text-slate-600 font-medium">Section key</span>
              <select
                value={form.sectionKey}
                onChange={(e) => setForm((p) => ({ ...p, sectionKey: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              >
                {SECTION_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-600 font-medium">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-600 font-medium">Title</span>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-600 font-medium">Subtitle</span>
              <input
                value={form.subtitle}
                onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-600 font-medium">Body</span>
              <textarea
                value={form.body}
                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600 font-medium">CTA label</span>
              <input
                value={form.ctaLabel}
                onChange={(e) => setForm((p) => ({ ...p, ctaLabel: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600 font-medium">CTA URL</span>
              <input
                value={form.ctaUrl}
                onChange={(e) => setForm((p) => ({ ...p, ctaUrl: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="sm:col-span-2 space-y-2">
              <span className="text-sm text-slate-600 font-medium">Media</span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                  <ImagePlus className="w-4 h-4 text-indigo-600" />
                  {uploading ? 'Uploading…' : 'Upload image'}
                  <input type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={handleMediaUpload} disabled={uploading} />
                </label>
                {form.mediaUrl && (
                  <a href={form.mediaUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline truncate max-w-xs">
                    {form.mediaUrl}
                  </a>
                )}
              </div>
              {form.mediaUrl && form.mediaType !== 'VIDEO' && (
                <img src={form.mediaUrl} alt="" className="h-20 rounded-lg border border-slate-200 object-cover" />
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save section
            </button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <p className="text-slate-600 font-medium">No sections yet</p>
          <p className="text-sm text-slate-500 mt-1">Create a section or clear the type filter.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
          {filtered.map((section, idx) => (
            <div key={section.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-slate-50/80">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveSection(idx, -1)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                  title="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(idx, 1)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                  title="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{section.sectionKey}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBadge(section.status)}`}>{section.status}</span>
                </div>
                <p className="text-sm font-medium text-slate-900 truncate mt-0.5">{section.title || '(untitled)'}</p>
                {section.subtitle && <p className="text-xs text-slate-500 truncate">{section.subtitle}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {section.status !== 'PUBLISHED' && (
                  <button
                    type="button"
                    onClick={() => handleStatus(section.id, 'PUBLISHED')}
                    className="px-2 py-1 text-xs rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    Publish
                  </button>
                )}
                {section.status !== 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => handleStatus(section.id, 'DRAFT')}
                    className="px-2 py-1 text-xs rounded-md border border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    Draft
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(section)}
                  className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(section.id)}
                  className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-indigo-600" />
          Version history
        </h3>
        {versions.length === 0 ? (
          <p className="text-sm text-slate-500">No published versions yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {versions.map((v) => (
              <li key={v.id || v.version} className="flex items-center justify-between py-2.5 gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    v{v.version} {v.label ? `— ${v.label}` : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestore(v.version)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
