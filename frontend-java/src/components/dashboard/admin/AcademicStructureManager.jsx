import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle, FaGraduationCap, FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';
import { SkeletonTable, Spinner } from '../../ui/loading';
import api from '../../../services/api';
import { useToast } from '../../ui/Toast';

const AcademicStructureManager = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('schools');
  const [data, setData] = useState({
    schools: [],
    centers: [],
    batches: []
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState({
    show: false,
    type: 'add', // add or edit
    category: 'schools', // schools, centers, batches
    item: null
  });

  const [form, setForm] = useState({
    name: '',
    code: '',
    location: '',
    year: '',
    label: '',
    status: 'ACTIVE'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, c, b] = await Promise.all([
        api.getSchools({ includeInactive: true }),
        api.getCenters({ includeInactive: true }),
        api.getBatches({ includeInactive: true }),
      ]);
      setData({
        schools: s || [],
        centers: c || [],
        batches: b || []
      });
    } catch (err) {
      toast?.error('Failed to load academic structure data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (category, type = 'add', item = null) => {
    setModal({ show: true, type, category, item });
    if (type === 'edit' && item) {
      setForm({
        name: item.name || '',
        code: item.code || '',
        location: item.location || '',
        year: item.year || '',
        label: item.label || '',
        status: item.status || 'ACTIVE'
      });
    } else {
      setForm({
        name: '',
        code: '',
        location: '',
        year: '',
        label: '',
        status: 'ACTIVE'
      });
    }
  };

  const handleCloseModal = () => {
    setModal({ show: false, type: 'add', category: 'schools', item: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    const { category, type, item } = modal;

    try {
      let result;
      if (category === 'schools') {
        if (type === 'add') result = await api.createSchool({ name: form.name, code: form.code });
        else result = await api.updateSchool(item.id, { name: form.name, code: form.code, status: form.status });
      } else if (category === 'centers') {
        if (type === 'add') result = await api.createCenter({ name: form.name, location: form.location });
        else result = await api.updateCenter(item.id, { name: form.name, location: form.location, status: form.status });
      } else if (category === 'batches') {
        if (type === 'add') result = await api.createBatch({ year: form.year, label: form.label });
        else result = await api.updateBatch(item.id, { year: form.year, label: form.label, status: form.status });
      }

      toast?.success(`${category.slice(0, -1)} ${type === 'add' ? 'created' : 'updated'} successfully`);
      handleCloseModal();
      loadData();
    } catch (err) {
      toast?.error(err.message || `Failed to ${type} ${category.slice(0, -1)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (category, id) => {
    if (!window.confirm('Are you sure you want to delete this? This action cannot be undone if no students are assigned.')) return;
    
    try {
      if (category === 'schools') await api.deleteSchool(id);
      else if (category === 'centers') await api.deleteCenter(id);
      else if (category === 'batches') await api.deleteBatch(id);
      
      toast?.success('Deleted successfully');
      loadData();
    } catch (err) {
      toast?.error(err.message || 'Failed to delete');
    }
  };

  const tabs = [
    { id: 'schools', label: 'Branches', icon: FaGraduationCap },
    { id: 'centers', label: 'Campuses', icon: FaMapMarkerAlt },
    { id: 'batches', label: 'Batches', icon: FaCalendarAlt }
  ];

  const activeTabMeta = tabs.find((t) => t.id === activeTab) || tabs[0];
  const addLabel = `Add New ${activeTabMeta.label.replace(/es$/, '').replace(/s$/, '')}`;

  if (loading) {
    return (
      <SkeletonTable rows={8} columns={4} />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Academic Structure</h2>
          <p className="text-sm text-gray-500">Manage branches, campuses, and student batches.</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal(activeTab)}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-md text-sm font-medium transition-colors shrink-0"
        >
          <FaPlus /> {addLabel}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <div
            className="inline-flex rounded-md border border-gray-200 bg-white p-0.5 shadow-sm"
            role="tablist"
            aria-label="Academic structure"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-800 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Name / Info</th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500">ID / Code</th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data[activeTab].length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-16 text-center">
                  <p className="text-sm text-gray-500 mb-4">
                    No {activeTab} defined yet. Create your first {activeTabMeta.label.toLowerCase().replace(/es$/, '').replace(/s$/, '')} to get started.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenModal(activeTab)}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <FaPlus /> {addLabel}
                  </button>
                </td>
              </tr>
            ) : (
              data[activeTab].map(item => (
                <tr key={item.id} className="hover:bg-sky-50/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {activeTab === 'batches' ? item.year : item.name}
                    </div>
                    {activeTab === 'centers' && item.location && (
                      <div className="text-xs text-gray-500 mt-0.5">{item.location}</div>
                    )}
                    {activeTab === 'batches' && item.label && (
                      <div className="text-xs text-gray-500 mt-0.5">Label: {item.label}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {activeTab === 'schools' ? item.code || 'N/A' : item.id.substring(0, 8) + '...'}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${
                      item.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {item.status === 'ACTIVE' ? <FaCheckCircle size={10} /> : <FaTimesCircle size={10} />}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(activeTab, 'edit', item)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(activeTab, item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                {modal.type === 'add' ? 'Add' : 'Edit'}{' '}
                {(tabs.find((t) => t.id === modal.category) || tabs[0]).label.replace(/es$/, '').replace(/s$/, '')}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <FaTimesCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modal.category === 'schools' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. School of Technology"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Code</label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={e => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g. SOT"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white"
                    />
                  </div>
                </>
              )}

              {modal.category === 'centers' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campus Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Bangalore"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location Info</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Electronic City"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white"
                    />
                  </div>
                </>
              )}

              {modal.category === 'batches' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch Year / Range</label>
                    <input
                      type="text"
                      required
                      value={form.year}
                      onChange={e => setForm({ ...form, year: e.target.value })}
                      placeholder="e.g. 2023-2027"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Label</label>
                    <input
                      type="text"
                      value={form.label}
                      onChange={e => setForm({ ...form, label: e.target.value })}
                      placeholder="e.g. 23-27"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white"
                    />
                  </div>
                </>
              )}

              {modal.type === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Spinner size="sm" tone="white" /> : (modal.type === 'add' ? 'Create' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicStructureManager;
