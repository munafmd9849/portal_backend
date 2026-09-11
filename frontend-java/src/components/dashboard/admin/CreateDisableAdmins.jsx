/**
 * Manage admins (Super Admin only)
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaUserPlus, FaBan, FaCheckCircle, FaUsers } from 'react-icons/fa';
import { Settings, X, Briefcase, Users, Target, Activity, Clock, ChevronRight, Mail, User, Shield, Info, BarChart3, TrendingUp, History } from 'lucide-react';
import { SkeletonTable, SkeletonStatsGrid, Spinner } from '../../ui/loading';
import api from '../../../services/api';
import { useToast } from '../../ui/Toast';
import {
  adminRecordToForm,
  formatScopeDimensionDisplay,
  isAdminFullAccess,
} from '../../../utils/adminScopeDisplay';

export default function CreateDisableAdmins() {
  const toast = useToast();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [performanceModal, setPerformanceModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [perfData, setPerfData] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [form, setForm] = useState({ 
    email: '', 
    password: '', 
    displayName: '',
    role: 'ADMIN',
    fullAccess: true,
    allowedSchoolIds: [],
    allowedCenterIds: [],
    allowedBatchIds: []
  });
  const [academicData, setAcademicData] = useState({ schools: [], centers: [], batches: [] });
  const [academicLoading, setAcademicLoading] = useState(false);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const res = await api.listSuperAdminAdmins();
      setAdmins(res.admins || []);
    } catch (e) {
      console.error('Load admins error:', e);
      toast?.error(e.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const loadAcademicData = async () => {
    try {
      setAcademicLoading(true);
      const [s, c, b] = await Promise.all([
        api.getSchools(),
        api.getCenters(),
        api.getBatches()
      ]);
      setAcademicData({ 
        schools: s || [], 
        centers: c || [], 
        batches: b || [] 
      });
    } catch (e) {
      console.error('Load academic data error:', e);
    } finally {
      setAcademicLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
    loadAcademicData();
  }, []);

  const validateScopeForm = () => {
    if (form.fullAccess) return true;
    if (!form.allowedSchoolIds.length || !form.allowedCenterIds.length || !form.allowedBatchIds.length) {
      toast?.error('Select at least one school, campus, and batch — or enable full access');
      return false;
    }
    return true;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.email?.trim() || !form.password?.trim()) {
      toast?.error('Email and password are required');
      return;
    }
    if (!validateScopeForm()) return;
    try {
      setActionLoading({ create: true });
      await api.createSuperAdminAdmin({
        email: form.email.trim(),
        password: form.password,
        displayName: form.displayName?.trim() || undefined,
        role: form.role,
        fullAccess: form.fullAccess,
        allowedSchoolIds: form.fullAccess ? [] : form.allowedSchoolIds,
        allowedCenterIds: form.fullAccess ? [] : form.allowedCenterIds,
        allowedBatchIds: form.fullAccess ? [] : form.allowedBatchIds,
        permissions: ['*'] 
      });
      toast?.success('Admin created successfully');
      setCreateModal(false);
      resetForm();
      await loadAdmins();
    } catch (e) {
      toast?.error(e.message || 'Failed to create admin');
    } finally {
      setActionLoading({ create: false });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateScopeForm()) return;
    try {
      setActionLoading({ update: true });
      await api.updateSuperAdminAdmin(selectedAdmin.id, {
        displayName: form.displayName?.trim(),
        role: form.role,
        fullAccess: form.fullAccess,
        allowedSchoolIds: form.fullAccess ? [] : form.allowedSchoolIds,
        allowedCenterIds: form.fullAccess ? [] : form.allowedCenterIds,
        allowedBatchIds: form.fullAccess ? [] : form.allowedBatchIds,
      });
      toast?.success('Admin updated successfully');
      setEditModal(false);
      resetForm();
      await loadAdmins();
    } catch (e) {
      toast?.error(e.message || 'Failed to update admin');
    } finally {
      setActionLoading({ update: false });
    }
  };

  const resetForm = () => {
    setForm({ 
      email: '', 
      password: '', 
      displayName: '', 
      role: 'ADMIN',
      fullAccess: true,
      allowedSchoolIds: [],
      allowedCenterIds: [],
      allowedBatchIds: []
    });
    setSelectedAdmin(null);
  };

  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    const scopeForm = adminRecordToForm(admin, academicData);
    setForm({
      email: admin.email,
      displayName: admin.displayName || '',
      role: admin.adminRole || 'ADMIN',
      fullAccess: scopeForm.fullAccess,
      allowedSchoolIds: scopeForm.allowedSchoolIds,
      allowedCenterIds: scopeForm.allowedCenterIds,
      allowedBatchIds: scopeForm.allowedBatchIds,
    });
    setEditModal(true);
  };

  const openPerformanceModal = async (admin) => {
    setSelectedAdmin(admin);
    setPerformanceModal(true);
    setPerfLoading(true);
    try {
      const res = await api.getAdminPerformance(admin.id);
      setPerfData(res);
    } catch (e) {
      toast?.error('Failed to load performance data');
      setPerformanceModal(false);
    } finally {
      setPerfLoading(false);
    }
  };

  // Body Scroll Lock
  useEffect(() => {
    if (performanceModal || createModal || editModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [performanceModal, createModal, editModal]);

  const handleDisable = async (admin) => {
    if (!window.confirm(`Disable admin "${admin.email}"?`)) return;
    try {
      setActionLoading((p) => ({ ...p, [admin.id]: true }));
      await api.disableSuperAdminAdmin(admin.id);
      toast?.success('Admin disabled');
      await loadAdmins();
    } catch (e) {
      toast?.error(e.message || 'Failed to disable admin');
    } finally {
      setActionLoading((p) => ({ ...p, [admin.id]: false }));
    }
  };

  const handleEnable = async (admin) => {
    try {
      setActionLoading((p) => ({ ...p, [admin.id]: true }));
      await api.enableSuperAdminAdmin(admin.id);
      toast?.success('Admin enabled');
      await loadAdmins();
    } catch (e) {
      toast?.error(e.message || 'Failed to enable admin');
    } finally {
      setActionLoading((p) => ({ ...p, [admin.id]: false }));
    }
  };

  return (
    <div className="space-y-3">
      <div className="w-full space-y-3">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setCreateModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            <FaUserPlus className="w-3.5 h-3.5" /> New admin
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <SkeletonTable rows={6} columns={5} />
          ) : admins.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FaUsers className="text-4xl text-gray-300 mx-auto mb-2" />
              <p>No administrative accounts found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Admin</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Role</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Scope</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {admins.map((a) => (
                    <tr key={a.id} className="hover:bg-sky-50/40 transition-colors group cursor-pointer" onClick={() => openPerformanceModal(a)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                            {a.displayName?.[0] || a.email?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 group-hover:text-sky-600 transition-colors">{a.displayName || 'Unnamed Admin'}</div>
                            <div className="text-xs text-gray-500">{a.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${
                          a.adminRole === 'SUPER_ADMIN' ? 'bg-amber-50 text-amber-800 border-amber-200' : 
                          a.adminRole === 'COORDINATOR' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-sky-50 text-sky-700 border border-sky-100'
                        }`}>
                          {a.adminRole || 'ADMIN'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isAdminFullAccess(a) ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-100">
                            Full access
                          </span>
                        ) : (
                          <>
                            <div className="text-xs text-gray-600 max-w-[220px]">
                              <span className="font-semibold text-sky-600">Branches:</span>{' '}
                              {formatScopeDimensionDisplay(
                                a.allowedSchoolIds,
                                a.allowedSchools,
                                academicData.schools,
                                'schools',
                                (school) => school?.name
                              )}
                            </div>
                            <div className="text-xs text-gray-500 max-w-[220px] mt-0.5">
                              <span className="font-semibold text-sky-600">Campuses:</span>{' '}
                              {formatScopeDimensionDisplay(
                                a.allowedCenterIds,
                                a.allowedCenters,
                                academicData.centers,
                                'campuses',
                                (center) => center?.name
                              )}
                            </div>
                            <div className="text-xs text-gray-500 max-w-[220px] mt-0.5">
                              <span className="font-semibold text-sky-600">Batches:</span>{' '}
                              {formatScopeDimensionDisplay(
                                a.allowedBatchIds,
                                a.allowedBatches,
                                academicData.batches,
                                'batches',
                                (batch) => batch?.year?.trim() || batch?.label
                              )}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          a.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(a); }}
                            className="p-2 text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Edit Scope"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          {a.adminRole !== 'SUPER_ADMIN' && (
                            a.status === 'ACTIVE' ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDisable(a); }}
                                disabled={actionLoading[a.id]}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Disable"
                              >
                                {actionLoading[a.id] ? <Spinner size="sm" /> : <FaBan className="w-4 h-4" />}
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEnable(a); }}
                                disabled={actionLoading[a.id]}
                                className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                title="Enable"
                              >
                                {actionLoading[a.id] ? <Spinner size="sm" /> : <FaCheckCircle className="w-4 h-4" />}
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(createModal || editModal) && (
        <div className="fixed inset-0 bg-slate-900/50  flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg border border-gray-200 w-full overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-900">
                {createModal ? 'New admin' : 'Edit admin scope'}
              </h2>
              <button onClick={() => { setCreateModal(false); setEditModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={createModal ? handleCreate : handleUpdate} className="p-6 space-y-4">
              {createModal && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Email Address *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 outline-none transition-all"
                        placeholder="admin@institution.edu"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Password *</label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 outline-none transition-all"
                        placeholder="••••••••"
                        required={createModal}
                        minLength={6}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Display Name</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 outline-none transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Access Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 outline-none transition-all"
                >
                  <option value="ADMIN">Admin (Full access to scoped data)</option>
                  <option value="COORDINATOR">Coordinator (Limited access to scoped data)</option>
                  <option value="SUPER_ADMIN">Super Admin (Global Access)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-gray-50">
                <h3 className="text-xs font-bold text-sky-600 uppercase mb-3">Institutional Scope (Data Isolation)</h3>

                <label className="flex items-start gap-3 p-3 mb-4 rounded-lg border border-emerald-200 bg-emerald-50/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.fullAccess}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((p) => ({
                        ...p,
                        fullAccess: checked,
                        ...(checked
                          ? {
                              allowedSchoolIds: [],
                              allowedCenterIds: [],
                              allowedBatchIds: [],
                            }
                          : {}),
                      }));
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-emerald-900">Full access</span>
                    <span className="block text-[11px] text-emerald-700/80 mt-0.5">
                      Can view and manage all schools, campuses, and batches
                    </span>
                  </span>
                </label>

                {!form.fullAccess && (
                  <>
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                      Restricted mode: pick at least one branch, campus, and batch.
                    </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Allowed Branches</label>
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50 space-y-1">
                      {academicData.schools.length === 0 ? (
                        <div className="text-[10px] text-gray-400 italic p-1">No branches defined</div>
                      ) : (
                        academicData.schools.map(s => (
                          <label key={s.id} className="flex items-center gap-2 px-2 py-1 hover:bg-white rounded cursor-pointer transition-colors text-[11px] text-gray-700">
                            <input 
                              type="checkbox" 
                              checked={form.allowedSchoolIds.includes(s.id)}
                              onChange={(e) => {
                                const newIds = e.target.checked 
                                  ? [...form.allowedSchoolIds, s.id]
                                  : form.allowedSchoolIds.filter(id => id !== s.id);
                                setForm(p => ({ ...p, allowedSchoolIds: newIds }));
                              }}
                              className="w-3 h-3 rounded border-gray-300 text-sky-600 focus:ring-sky-400"
                            />
                            {s.name}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Allowed Campuses</label>
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50 space-y-1">
                      {academicData.centers.length === 0 ? (
                        <div className="text-[10px] text-gray-400 italic p-1">No campuses defined</div>
                      ) : (
                        academicData.centers.map(c => (
                          <label key={c.id} className="flex items-center gap-2 px-2 py-1 hover:bg-white rounded cursor-pointer transition-colors text-[11px] text-gray-700">
                            <input 
                              type="checkbox" 
                              checked={form.allowedCenterIds.includes(c.id)}
                              onChange={(e) => {
                                const newIds = e.target.checked 
                                  ? [...form.allowedCenterIds, c.id]
                                  : form.allowedCenterIds.filter(id => id !== c.id);
                                setForm(p => ({ ...p, allowedCenterIds: newIds }));
                              }}
                              className="w-3 h-3 rounded border-gray-300 text-sky-600 focus:ring-sky-400"
                            />
                            {c.name}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Allowed Batches</label>
                  <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                    {academicData.batches.length === 0 ? (
                      <div className="text-[10px] text-gray-400 italic">No batches defined</div>
                    ) : (
                      academicData.batches.map(b => (
                        <label key={b.id} className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all border ${
                          form.allowedBatchIds.includes(b.id) 
                            ? 'bg-blue-600 border-blue-600 text-white' 
                            : 'bg-white border-gray-200 text-gray-500 hover:border-sky-300'
                        }`}>
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={form.allowedBatchIds.includes(b.id)}
                            onChange={(e) => {
                              const newIds = e.target.checked 
                                ? [...form.allowedBatchIds, b.id]
                                : form.allowedBatchIds.filter(id => id !== b.id);
                              setForm(p => ({ ...p, allowedBatchIds: newIds }));
                            }}
                          />
                          {b.year}
                        </label>
                      ))
                    )}
                  </div>
                </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => { setCreateModal(false); setEditModal(false); resetForm(); }}
                  className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.create || actionLoading.update}
                  className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700  disabled:opacity-50 flex items-center gap-2 font-semibold transition-all"
                >
                  {(actionLoading.create || actionLoading.update) && <Spinner size="sm" />}
                  {createModal ? 'Create admin' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
       )}

      {/* Performance Dashboard Modal */}
      {performanceModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/50  flex items-center justify-center z-[100] p-4" onClick={() => setPerformanceModal(false)}>
          <div className="bg-gray-50 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-white/20 " onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="px-4 py-3 bg-white border-b border-gray-200 relative flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPerformanceModal(false)}
                className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 bg-sky-50 text-sky-700 border border-sky-100 rounded-md flex items-center justify-center font-semibold text-sm shrink-0">
                {selectedAdmin?.displayName?.[0] || selectedAdmin?.email?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 pr-8">
                <h2 className="text-sm font-semibold text-gray-900 truncate">
                  {selectedAdmin?.displayName || 'Admin'}
                </h2>
                <p className="text-xs text-gray-500 truncate">
                  {selectedAdmin?.email} · {selectedAdmin?.adminRole || 'ADMIN'}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {perfLoading ? (
                <SkeletonStatsGrid count={4} columns="grid-cols-2 md:grid-cols-4" />
              ) : perfData ? (
                <>
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3.5">
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                      <div className="px-3 py-2 md:py-0">
                        <p className="text-xs font-medium text-gray-500">Jobs created</p>
                        <p className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">
                          {perfData.stats.totalJobsCreated}
                        </p>
                      </div>
                      <div className="px-3 py-2 md:py-0">
                        <p className="text-xs font-medium text-gray-500">Updates</p>
                        <p className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">
                          {perfData.stats.totalJobsUpdated}
                        </p>
                      </div>
                      <div className="px-3 py-2 md:py-0">
                        <p className="text-xs font-medium text-gray-500">Applications</p>
                        <p className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">
                          {perfData.stats.totalApplications}
                        </p>
                      </div>
                      <div className="px-3 py-2 md:py-0">
                        <p className="text-xs font-medium text-gray-500">Reach</p>
                        <p className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">
                          {perfData.stats.totalReach}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* Recent Drives */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-sky-600" />
                        Recent job postings
                      </h3>
                      <div className="space-y-2">
                        {perfData.recentJobs.length === 0 ? (
                          <div className="p-6 text-center bg-white rounded-lg border border-dashed border-gray-200">
                            <p className="text-sm text-gray-500">No jobs posted yet</p>
                          </div>
                        ) : perfData.recentJobs.map(job => (
                          <div key={job.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group hover:border-sky-300 transition-all">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900 truncate">{job.jobTitle}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{job.companyName} • {new Date(job.createdAt).toLocaleDateString()}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${
                              job.status === 'POSTED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {job.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-sky-600" />
                        Recent activity
                      </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {perfData.recentActivity.length === 0 ? (
                          <div className="p-6 text-center bg-white rounded-lg border border-dashed border-gray-200">
                            <p className="text-sm text-gray-500">No recent activity logged</p>
                          </div>
                        ) : perfData.recentActivity.map((log) => (
                          <div key={log.id} className="bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <span className="text-xs font-medium text-sky-700">
                                {log.action.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[11px] text-gray-400 tabular-nums shrink-0">
                                {new Date(log.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {log.details || `Admin performed ${log.action} on ${log.target}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-slate-400">
                  Failed to load performance data.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 bg-white border-t border-slate-100 text-center">
              <button onClick={() => setPerformanceModal(false)} className="text-slate-400 hover:text-slate-600 text-[10px] font-semibold font-medium transition-colors">
                Click outside to close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
