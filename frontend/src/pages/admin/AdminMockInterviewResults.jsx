import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Search } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { SkeletonTable, SkeletonStatsGrid } from '../../components/ui/loading';
import MockInterviewResultBody from '../../components/mockInterview/MockInterviewResultBody';

function formatSessionTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AdminMockInterviewResultsComponent() {
  const { id: driveId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const basePath = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!driveId) return;
    try {
      setLoading(true);
      const res = await api.getMockInterviewDriveResults(driveId);
      setData(res);
      const slotParam = searchParams.get('slot');
      if (slotParam && res?.sessions?.length) {
        const match = res.sessions.find((s) => s.id === slotParam);
        setSelectedSession(match || null);
      } else {
        setSelectedSession(null);
      }
    } catch (err) {
      toast?.error(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [driveId, searchParams, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBack = () => {
    navigate(`${basePath}?tab=mockInterviews`);
  };

  const openReport = (session) => {
    setSelectedSession(session);
    setSearchParams({ slot: session.id });
  };

  const closeReport = () => {
    setSelectedSession(null);
    setSearchParams({});
  };

  const sessions = (data?.sessions || []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.student?.fullName?.toLowerCase().includes(q) ||
      s.student?.enrollmentId?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="space-y-3 pb-8">
        <SkeletonStatsGrid count={3} columns="grid-cols-3" />
        <SkeletonTable rows={8} columns={5} />
      </div>
    );
  }

  const drive = data?.drive;
  const stats = data?.stats || { totalAttempts: 0, avgScore: 0 };
  const avgScore = stats.avgScore ?? 0;

  if (selectedSession) {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
          <button
            type="button"
            onClick={closeReport}
            className="p-2 text-gray-500 hover:text-gray-900 bg-gray-50 rounded-md border border-gray-200 shrink-0"
            aria-label="Back to list"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              {selectedSession.student?.fullName || 'Candidate'}
            </h1>
            <p className="text-xs text-gray-500 truncate">
              {selectedSession.student?.enrollmentId || 'Feedback report'}
            </p>
          </div>
        </div>

        <MockInterviewResultBody
          scorePercent={selectedSession.scorePercent}
          feedback={selectedSession.feedback}
          durationSeconds={selectedSession.durationSeconds}
          driveCategory={drive?.category}
          badgeSuffix="Candidate feedback"
          sessionTime={formatSessionTime(selectedSession.startTime)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8">
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
        <button
          type="button"
          onClick={handleBack}
          className="p-2 text-gray-500 hover:text-gray-900 bg-gray-50 rounded-md border border-gray-200 shrink-0"
          aria-label="Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 truncate">
            {drive?.title || 'Drive results'}
          </h1>
          <p className="text-xs text-gray-500">
            {drive?.category || 'Mock'}
            {drive?.date ? ` · ${new Date(drive.date).toLocaleDateString()}` : ''}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3.5">
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <div className="px-3 text-center sm:text-left">
            <p className="text-xs font-medium text-gray-500">Sessions</p>
            <p className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">
              {stats.totalAttempts}
            </p>
          </div>
          <div className="px-3 text-center sm:text-left">
            <p className="text-xs font-medium text-sky-700">Avg score</p>
            <p className="text-2xl font-semibold text-sky-700 tabular-nums mt-0.5">{avgScore}%</p>
          </div>
          <div className="px-3 text-center sm:text-left">
            <p className="text-xs font-medium text-gray-500">Drive date</p>
            <p className="text-sm font-semibold text-gray-900 mt-1.5">
              {drive?.date ? new Date(drive.date).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900 tabular-nums">{sessions.length}</span> candidates
          </p>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">#</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Candidate</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-center">Score</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-center">Result</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Session</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map((session, idx) => (
                <tr key={session.id} className="hover:bg-sky-50/40 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{session.student?.fullName || '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{session.student?.enrollmentId}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-sky-700 tabular-nums">
                      {session.scorePercent ?? 0}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-gray-600">
                      {session.feedback?.result?.replace(/_/g, ' ') || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatSessionTime(session.startTime)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openReport(session)}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md"
                    >
                      View report
                    </button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-sm text-gray-500">
                    No completed sessions with interviewer feedback yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminMockInterviewResults() {
  return (
    <ErrorBoundary>
      <AdminMockInterviewResultsComponent />
    </ErrorBoundary>
  );
}
