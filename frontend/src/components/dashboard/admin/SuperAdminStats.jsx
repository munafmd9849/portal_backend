/**
 * Super Admin Statistics: by center, department (school), admins, summary
 */

import React, { useEffect, useState } from 'react';
import { Building2, GraduationCap, Users, Loader2 } from 'lucide-react';
import api from '../../../services/api';

export default function SuperAdminStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.getStatsSummary();
        if (!cancelled) setStats(res);
      } catch (e) {
        console.error('Super Admin stats error:', e);
        if (!cancelled) setStats({ byCenter: [], bySchool: [], admins: [], summary: {} });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-3">
        <Loader2 className="animate-spin w-7 h-7 text-sky-600" />
        <p className="text-sm text-gray-500">Loading statistics…</p>
      </div>
    );
  }

  const s = stats?.summary || {};
  const byCenter = stats?.byCenter || [];
  const bySchool = stats?.bySchool || [];
  const admins = stats?.admins || [];

  const summaryStrip = [
    { label: 'Students', value: s.totalStudents ?? 0 },
    { label: 'Jobs', value: s.totalJobs ?? 0 },
    { label: 'Applications', value: s.totalApplications ?? 0 },
    { label: 'Placed', value: s.placedStudents ?? 0, accent: true },
  ];

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3.5">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {summaryStrip.map(({ label, value, accent }) => (
            <div key={label} className="px-3 py-2 md:py-0">
              <p className={`text-xs font-medium ${accent ? 'text-emerald-700' : 'text-gray-500'}`}>{label}</p>
              <p
                className={`text-2xl font-semibold tabular-nums mt-0.5 ${
                  accent ? 'text-emerald-700' : 'text-gray-900'
                }`}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-sky-600" />
            <p className="text-sm font-medium text-gray-900">By campus</p>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2 text-xs font-medium text-gray-500">Campus</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 text-right">Active / Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byCenter.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-10 text-center text-sm text-gray-500">
                      No data
                    </td>
                  </tr>
                ) : (
                  byCenter.map((c) => (
                    <tr key={c.center} className="hover:bg-sky-50/40">
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{c.center}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 text-right tabular-nums">
                        {c.active} / {c.total}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
            <p className="text-sm font-medium text-gray-900">By branch</p>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2 text-xs font-medium text-gray-500">Branch</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 text-right">Active / Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bySchool.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-10 text-center text-sm text-gray-500">
                      No data
                    </td>
                  </tr>
                ) : (
                  bySchool.map((x) => (
                    <tr key={x.school} className="hover:bg-sky-50/40">
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{x.school}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 text-right tabular-nums">
                        {x.active} / {x.total}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-sky-600" />
            <p className="text-sm font-medium text-gray-900">Admin activity</p>
          </div>
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900 tabular-nums">{admins.length}</span> admins
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Admin</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-center">Jobs posted</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Last activity</th>
                <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-12 text-center text-sm text-gray-500">
                    No admin accounts found
                  </td>
                </tr>
              ) : (
                admins.map((a) => (
                  <tr key={a.id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{a.displayName || 'Unnamed Admin'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.email}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-sky-700 tabular-nums">{a.jobsCount || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      {a.lastJobAt ? (
                        <>
                          <p className="text-sm text-gray-700">
                            {new Date(a.lastJobAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(a.lastJobAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">No jobs yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${
                          a.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
