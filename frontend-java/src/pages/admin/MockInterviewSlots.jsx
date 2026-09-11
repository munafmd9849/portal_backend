import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserPlus, Search, Video, AlertCircle, X,
  ChevronRight, Edit2,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { SkeletonDirectoryPage } from '../../components/ui/loading';
import { toDatetimeLocalValue, datetimeLocalToISO } from '../../utils/datetimeLocal';

function statusBadge(status) {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-gray-50 text-gray-500 border-gray-200';
    case 'SCHEDULED':
      return 'bg-sky-50 text-sky-700 border-sky-100';
    case 'WAITING':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'LIVE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'COMPLETED':
      return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'MISSED':
      return 'bg-rose-50 text-rose-700 border-rose-100';
    case 'NO_SHOW':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-gray-50 text-gray-500 border-gray-200';
  }
}

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MockInterviewSlots() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [drive, setDrive] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [editTiming, setEditTiming] = useState({ startTime: '', endTime: '' });
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const drives = await api.getMockInterviewDrives();
      const current = drives.find((d) => d.id === id);
      setDrive(current);
    } catch (err) {
      toast.error('Failed to load slots');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  const loadStudents = useCallback(async () => {
    try {
      const res = await api.getAllStudents();
      setStudents(res.students || []);
    } catch (err) {
      console.error('Failed to load students');
    }
  }, []);

  useEffect(() => {
    loadData();
    loadStudents();
  }, [loadData, loadStudents]);

  const handleAssign = async (studentId) => {
    if (!selectedSlot) return;
    setAssignmentLoading(true);
    try {
      await api.assignStudentToSlot({
        slotId: selectedSlot.id,
        studentId,
      });
      toast.success('Student assigned');
      setSelectedSlot(null);
      setSearchQuery('');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Assignment failed');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const updateStatus = async (slotId, status) => {
    try {
      await api.updateMockSlotStatus({ slotId, status });
      toast.success(`Status updated to ${status}`);
      loadData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleUpdateTiming = async () => {
    const startISO = datetimeLocalToISO(editTiming.startTime);
    const endISO = datetimeLocalToISO(editTiming.endTime);
    if (!startISO || !endISO) {
      toast.error('Please set valid start and end times');
      return;
    }
    if (new Date(endISO) <= new Date(startISO)) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      const updated = await api.updateMockInterviewSlot(editingSlot.id, {
        startTime: startISO,
        endTime: endISO,
      });
      toast.success('Timing updated');
      setEditingSlot(null);
      setDrive((prev) => {
        if (!prev?.slots) return prev;
        return {
          ...prev,
          slots: prev.slots
            .map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
        };
      });
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update timing');
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.fullName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      String(s.batch || '').toLowerCase().includes(q)
    );
  });

  if (loading && !drive) {
    return <SkeletonDirectoryPage statsCount={3} tableRows={10} tableColumns={7} />;
  }

  if (!drive) {
    return (
      <div className="py-16 flex flex-col items-center text-center gap-3 max-w-sm mx-auto">
        <AlertCircle className="w-8 h-8 text-gray-300" />
        <h3 className="text-base font-semibold text-gray-900">Drive not found</h3>
        <p className="text-sm text-gray-500">This drive may have been removed.</p>
        <button
          type="button"
          onClick={() => navigate('/admin?tab=mockInterviews')}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Back to drives
        </button>
      </div>
    );
  }

  const slots = drive.slots || [];
  const assignedCount = slots.filter((s) => s.status !== 'AVAILABLE').length;
  const visibleSlots =
    statusFilter === 'all' ? slots : slots.filter((s) => s.status === statusFilter);

  const statusTabs = [
    { id: 'all', label: 'All', count: slots.length },
    { id: 'AVAILABLE', label: 'Open', count: slots.filter((s) => s.status === 'AVAILABLE').length },
    { id: 'SCHEDULED', label: 'Scheduled', count: slots.filter((s) => s.status === 'SCHEDULED').length },
    { id: 'WAITING', label: 'Waiting', count: slots.filter((s) => s.status === 'WAITING').length },
    { id: 'LIVE', label: 'Live', count: slots.filter((s) => s.status === 'LIVE').length },
    { id: 'COMPLETED', label: 'Done', count: slots.filter((s) => s.status === 'COMPLETED').length },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/admin?tab=mockInterviews')}
            className="p-2 hover:bg-gray-50 rounded-md text-gray-500 border border-gray-200 shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-semibold text-gray-900 truncate">{drive.title}</h1>
              {drive.category && (
                <span className="px-2 py-0.5 bg-gray-50 text-gray-600 text-xs font-medium rounded-md border border-gray-200">
                  {drive.category}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {drive.date
                ? new Date(drive.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'No date set'}
              {' · '}
              <span className="tabular-nums">{assignedCount}/{slots.length} assigned</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex flex-wrap rounded-md border border-gray-200 bg-white p-0.5 shadow-sm"
          role="tablist"
        >
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-slate-800 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[720px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">#</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Time</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Student</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Batch</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleSlots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                    No slots in this filter.
                  </td>
                </tr>
              ) : (
                visibleSlots.map((slot, idx) => {
                  const student = slot.student;
                  const isAvailable = slot.status === 'AVAILABLE';
                  return (
                    <tr key={slot.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-400 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 tabular-nums whitespace-nowrap">
                        {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSlot(slot);
                            setEditTiming({
                              startTime: toDatetimeLocalValue(slot.startTime),
                              endTime: toDatetimeLocalValue(slot.endTime),
                            });
                          }}
                          className="ml-2 inline-flex p-1 text-gray-400 hover:text-sky-700 hover:bg-sky-50 rounded-md align-middle"
                          title="Edit timing"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {isAvailable ? (
                          <span className="text-sm text-gray-400">Unassigned</span>
                        ) : (
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center text-xs font-semibold shrink-0">
                              {student?.fullName?.[0] || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {student?.fullName || '—'}
                              </p>
                              {student?.email && (
                                <p className="text-xs text-gray-500 truncate">{student.email}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {isAvailable ? '—' : student?.batch || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadge(slot.status)}`}
                        >
                          {slot.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isAvailable && (
                            <button
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Assign
                            </button>
                          )}
                          {slot.status === 'SCHEDULED' && (
                            <button
                              type="button"
                              onClick={() => updateStatus(slot.id, 'WAITING')}
                              className="px-2.5 py-1.5 border border-gray-200 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50"
                            >
                              Waiting
                            </button>
                          )}
                          {slot.status === 'WAITING' && (
                            <button
                              type="button"
                              onClick={() => updateStatus(slot.id, 'LIVE')}
                              className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-md text-xs font-medium hover:bg-emerald-700"
                            >
                              Start
                            </button>
                          )}
                          {(slot.status === 'LIVE' ||
                            slot.status === 'SCHEDULED' ||
                            slot.status === 'WAITING') && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/mock-interview-room/${slot.id}?role=interviewer&studentId=${slot.student?.id}`,
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700"
                            >
                              <Video className="w-3.5 h-3.5" />
                              Join
                            </button>
                          )}
                          {(slot.status === 'SCHEDULED' || slot.status === 'WAITING') && (
                            <button
                              type="button"
                              onClick={() => updateStatus(slot.id, 'MISSED')}
                              className="px-2.5 py-1.5 border border-gray-200 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-50"
                            >
                              Missed
                            </button>
                          )}
                          {slot.status === 'COMPLETED' && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/admin/mock-interviews/${id}/results?slot=${slot.id}`)
                              }
                              className="px-2.5 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700"
                            >
                              Feedback
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200 my-auto">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Assign candidate</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Slot {formatTime(selectedSlot.startTime)} – {formatTime(selectedSlot.endTime)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSlot(null);
                  setSearchQuery('');
                }}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search name, email, or batch"
                  className="w-full border border-gray-200 rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[360px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Student</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Batch</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 text-right"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-8 text-center text-sm text-gray-400">
                          No students match your search
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-sky-50/50">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-md bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center text-xs font-semibold shrink-0">
                                {student.fullName?.[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {student.fullName}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-sm text-gray-600">{student.batch || '—'}</td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleAssign(student.id)}
                              disabled={assignmentLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md disabled:opacity-50"
                            >
                              Assign
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200 my-auto">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Edit timing</h3>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Start</label>
                <input
                  type="datetime-local"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
                  value={editTiming.startTime}
                  onChange={(e) => setEditTiming({ ...editTiming, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">End</label>
                <input
                  type="datetime-local"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
                  value={editTiming.endTime}
                  onChange={(e) => setEditTiming({ ...editTiming, endTime: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateTiming}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
