/**
 * Success Stories manager — student & company stories for the landing page.
 * Clear naming: Student Success | Company Hiring | Alumni | Internship | Placement
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Star,
  StarOff,
  RefreshCw,
  X,
  ImagePlus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { SkeletonMediaRowList, Spinner } from '../../ui/loading';
import CustomDropdown from '../../common/CustomDropdown';
import {
  listStories,
  createStory,
  updateStory,
  deleteStory,
  uploadStoryMedia,
} from '../../../services/successStories';

const STORY_TYPES = [
  { value: 'STUDENT_SUCCESS', label: 'Student Success' },
  { value: 'COMPANY_HIRING', label: 'Company Hiring' },
  { value: 'ALUMNI', label: 'Alumni' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'PLACEMENT_ACHIEVEMENT', label: 'Placement Achievement' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const EMPTY_FORM = {
  id: null,
  type: 'STUDENT_SUCCESS',
  title: '',
  description: '',
  company: '',
  studentName: '',
  jobRole: '',
  packageCtc: '',
  campus: '',
  batch: '',
  branch: '',
  status: 'DRAFT',
  featured: false,
  sortOrder: 0,
  images: [],
  tags: '',
};

function typeLabel(type) {
  return STORY_TYPES.find((t) => t.value === type)?.label || type;
}

function statusBadge(status) {
  const map = {
    DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
    PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ARCHIVED: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[status] || map.DRAFT;
}

export default function SuccessStoriesManager() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ type: '', status: '', search: '' });
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listStories({
        type: filters.type || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        includeArchived: filters.status === 'ARCHIVED',
        limit: 100,
      });
      setItems(data?.items || []);
      setTotal(data?.total || 0);
    } catch (e) {
      setError(e?.message || 'Failed to load success stories');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filters.type, filters.status, filters.search]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (story) => {
    setForm({
      id: story.id,
      type: story.type || 'STUDENT_SUCCESS',
      title: story.title || '',
      description: story.description || '',
      company: story.company || '',
      studentName: story.studentName || '',
      jobRole: story.jobRole || '',
      packageCtc: story.packageCtc || '',
      campus: story.campus || '',
      batch: story.batch || '',
      branch: story.branch || '',
      status: story.status || 'DRAFT',
      featured: Boolean(story.featured),
      sortOrder: story.sortOrder ?? 0,
      images: Array.isArray(story.images) ? story.images : [],
      tags: Array.isArray(story.tags) ? story.tags.join(', ') : '',
    });
    setFormOpen(true);
  };

  const payloadFromForm = () => ({
    type: form.type,
    title: form.title.trim(),
    description: form.description.trim() || null,
    company: form.company.trim() || null,
    studentName: form.studentName.trim() || null,
    jobRole: form.jobRole.trim() || null,
    packageCtc: form.packageCtc.trim() || null,
    campus: form.campus.trim() || null,
    batch: form.batch.trim() || null,
    branch: form.branch.trim() || null,
    status: form.status,
    featured: form.featured,
    sortOrder: Number(form.sortOrder) || 0,
    images: form.images,
    tags: form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  });

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const payload = payloadFromForm();
      if (form.id) await updateStory(form.id, payload);
      else await createStory(payload);
      setFormOpen(false);
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to save story');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeatured = async (story) => {
    try {
      await updateStory(story.id, { featured: !story.featured });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to update featured flag');
    }
  };

  const handlePublishToggle = async (story) => {
    const next = story.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await updateStory(story.id, { status: next });
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (story) => {
    if (!window.confirm(`Archive “${story.title}”?`)) return;
    try {
      await deleteStory(story.id);
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to delete story');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const data = await uploadStoryMedia(file);
      const url = data?.url || data?.secure_url;
      const publicId = data?.publicId || data?.public_id;
      if (url) {
        setForm((f) => ({
          ...f,
          images: [...(f.images || []), { url, publicId }],
        }));
      }
    } catch (err) {
      setError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const showStudentFields = useMemo(
    () => ['STUDENT_SUCCESS', 'ALUMNI', 'INTERNSHIP', 'PLACEMENT_ACHIEVEMENT'].includes(form.type),
    [form.type],
  );

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-[1200px] mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Success Stories</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Student and company stories shown on the public landing page. Draft → Publish when ready.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> New story
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CustomDropdown
            label="Story type"
            compact
            options={[{ value: '', label: 'All types' }, ...STORY_TYPES]}
            value={filters.type}
            onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
          />
          <CustomDropdown
            label="Status"
            compact
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
            <input
              type="search"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Name, company, title…"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Stories <span className="text-slate-400 font-normal">({total})</span>
          </h2>
        </div>

        {loading ? (
          <SkeletonMediaRowList rows={5} />
        ) : items.length === 0 ? (
          <p className="text-center py-14 text-sm text-slate-500">
            No stories yet. Create a Student Success or Company Hiring story to show on the landing page.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((story) => {
              const cover = story.images?.[0]?.url;
              return (
                <li
                  key={story.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 hover:bg-slate-50/80"
                >
                  <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {cover ? (
                      <img src={cover} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{story.title}</p>
                      {story.featured && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                          Featured
                        </span>
                      )}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusBadge(story.status)}`}>
                        {story.status}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                        {typeLabel(story.type)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {[story.studentName, story.company, story.jobRole, story.packageCtc]
                        .filter(Boolean)
                        .join(' · ') || 'No details yet'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title={story.featured ? 'Unfeature' : 'Feature on landing'}
                      onClick={() => handleToggleFeatured(story)}
                      className="p-2 rounded-md border border-slate-200 hover:bg-white"
                    >
                      {story.featured ? (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      ) : (
                        <StarOff className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <button
                      type="button"
                      title={story.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                      onClick={() => handlePublishToggle(story)}
                      className="p-2 rounded-md border border-slate-200 hover:bg-white"
                    >
                      {story.status === 'PUBLISHED' ? (
                        <EyeOff className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => openEdit(story)}
                      className="p-2 rounded-md border border-slate-200 hover:bg-white"
                    >
                      <Pencil className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      type="button"
                      title="Archive"
                      onClick={() => handleDelete(story)}
                      className="p-2 rounded-md border border-slate-200 hover:bg-white"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-xl sm:rounded-xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {form.id ? 'Edit story' : 'New story'}
              </h3>
              <button type="button" onClick={() => setFormOpen(false)} className="p-1.5 rounded-md hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <CustomDropdown
                label="Story type"
                compact
                options={STORY_TYPES}
                value={form.type}
                onChange={(v) => setForm((f) => ({ ...f, type: v }))}
              />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Short headline for the landing card"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="One or two sentences"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {showStudentFields && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Student name</label>
                    <input
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                      value={form.studentName}
                      onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
                  <input
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                  <input
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    value={form.jobRole}
                    onChange={(e) => setForm((f) => ({ ...f, jobRole: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CTC / Package</label>
                  <input
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    value={form.packageCtc}
                    onChange={(e) => setForm((f) => ({ ...f, packageCtc: e.target.value }))}
                    placeholder="e.g. 12 LPA"
                  />
                </div>
                {showStudentFields && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Campus</label>
                      <input
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                        value={form.campus}
                        onChange={(e) => setForm((f) => ({ ...f, campus: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Batch</label>
                      <input
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                        value={form.batch}
                        onChange={(e) => setForm((f) => ({ ...f, batch: e.target.value }))}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <CustomDropdown
                  label="Status"
                  compact
                  options={[
                    { value: 'DRAFT', label: 'Draft' },
                    { value: 'PUBLISHED', label: 'Published' },
                    { value: 'ARCHIVED', label: 'Archived' },
                  ]}
                  value={form.status}
                  onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                />
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sort order</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-2 mt-6 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  Feature on landing
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tags (comma-separated)</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="SDE, Product, Internship"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Images</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(form.images || []).map((img, idx) => (
                    <div key={img.url || idx} className="relative w-16 h-16 rounded-md overflow-hidden border border-slate-200">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        className="absolute top-0.5 right-0.5 p-0.5 bg-white/90 rounded"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            images: f.images.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  {uploading ? <Spinner size="sm" /> : <Upload className="w-4 h-4" />}
                  Upload image
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
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
                Save story
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
