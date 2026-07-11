/**
 * Super Admin Statistics: by center, department (school), admins, summary
 */

import React, { useEffect, useState } from 'react';
import { BarChart3, Building2, GraduationCap, Users, Briefcase, ClipboardList, Loader2 } from 'lucide-react';
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
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Loader2 className="animate-spin w-10 h-10 text-indigo-600 mx-auto mb-2" />
          <p className="text-slate-500">Loading statistics...</p>
        </div>
      </div>
    );
  }

  const s = stats?.summary || {};
  const byCenter = stats?.byCenter || [];
  const bySchool = stats?.bySchool || [];
  const admins = stats?.admins || [];

  const summaryCards = [
    { label: 'Total Students', value: s.totalStudents ?? 0, icon: Users },
    { label: 'Total Jobs', value: s.totalJobs ?? 0, icon: Briefcase },
    { label: 'Applications', value: s.totalApplications ?? 0, icon: ClipboardList },
    { label: 'Placed', value: s.placedStudents ?? 0, icon: Users, accent: 'text-emerald-700' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2 tracking-tight">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          Admin Panel & Statistics
        </h1>
        <p className="text-sm text-slate-600 mt-1">System-wide placement metrics and admin activity</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Icon className="w-4 h-4" />
              {label}
            </div>
            <div className={`text-2xl font-semibold tabular-nums ${accent || 'text-slate-900'}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <Building2 className="w-4 h-4 text-indigo-600" />
            By Center
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {byCenter.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No data</div>
            ) : (
              byCenter.map((c) => (
                <div key={c.center} className="flex justify-between items-center px-4 py-3 hover:bg-slate-50">
                  <span className="font-medium text-slate-900">{c.center}</span>
                  <span className="text-sm text-slate-500 tabular-nums">
                    {c.active} active / {c.total} total
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            By Department (School)
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {bySchool.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No data</div>
            ) : (
              bySchool.map((x) => (
                <div key={x.school} className="flex justify-between items-center px-4 py-3 hover:bg-slate-50">
                  <span className="font-medium text-slate-900">{x.school}</span>
                  <span className="text-sm text-slate-500 tabular-nums">
                    {x.active} active / {x.total} total
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Admin Activity Overview
          </h2>
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-100">
            {admins.length} Total Admins
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-3">Admin Profile</th>
                <th className="px-6 py-3 text-center">Jobs Posted</th>
                <th className="px-6 py-3">Last Activity</th>
                <th className="px-6 py-3 text-right">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-slate-400">No admin accounts found</td>
                </tr>
              ) : (
                admins.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                          {a.displayName || 'Unnamed Admin'}
                        </span>
                        <span className="text-xs text-slate-500">{a.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 font-semibold px-3 py-1 rounded-lg border border-indigo-100 min-w-[50px] tabular-nums">
                        {a.jobsCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-sm text-slate-600">
                        {a.lastJobAt ? (
                          <>
                            <span className="font-medium text-slate-800">{new Date(a.lastJobAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <span className="text-[10px] text-slate-400 uppercase">{new Date(a.lastJobAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-xs">No jobs posted yet</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${
                        a.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
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
