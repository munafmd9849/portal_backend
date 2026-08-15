import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Spinner } from '../../../ui/loading';
import api from '../../../../services/api';
import { labelFormatType } from './labels';

function displayItem(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.text || value.label || value.name || value.topic || JSON.stringify(value);
  }
  return String(value);
}

function SessionRow({ session, onOpenSession }) {
  const [open, setOpen] = useState(false);
  const jd = session.analysisSummary;
  const roleLine = session.jobTitle
    ? `${session.jobTitle}${session.companyName ? ` · ${session.companyName}` : ''}`
    : session.role;

  return (
    <li className="border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-2 px-4 py-3">
        {jd ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-0.5 p-0.5 text-slate-400 hover:text-slate-700"
            aria-expanded={open}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <button
          type="button"
          onClick={() => onOpenSession?.(session.id)}
          className="flex-1 min-w-0 text-left hover:opacity-90"
        >
          <p className="text-sm font-medium text-slate-900 truncate">{roleLine}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(session.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            {' · '}
            {session.questionCount} questions
            {' · '}
            {labelFormatType(session.interviewType)}
            {session.status === 'COMPLETED' ? ' · Done' : ' · In progress'}
          </p>
        </button>
      </div>

      {open && jd && (
        <div className="px-4 pb-3 pl-11 space-y-2">
          <div>
            <p className="text-xs font-medium text-slate-800 mb-1">Resume ↔ JD match</p>
            {jd.strongMatches.length > 0 ? (
              <ul className="text-xs text-slate-700 space-y-0.5 list-disc pl-4">
                {jd.strongMatches.slice(0, 4).map((item, i) => (
                  <li key={i}>{displayItem(item)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No match data</p>
            )}
          </div>
          {jd.gaps.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-800 mb-1">Gaps to cover</p>
              <ul className="text-xs text-slate-600 space-y-0.5 list-disc pl-4">
                {jd.gaps.slice(0, 3).map((item, i) => (
                  <li key={i}>{displayItem(item)}</li>
                ))}
              </ul>
            </div>
          )}
          {jd.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {jd.skills.map((s, i) => (
                <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                  {displayItem(s)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function InterviewPrepHistory({ onOpenSession }) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const listRes = await api.listInterviewPrepSessions(30);
        if (!cancelled) setSessions(listRes.sessions || []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-[#6B8FD6]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        {error}
      </div>
    );
  }

  return (
    <section className="border border-slate-200 rounded-lg bg-white overflow-hidden min-w-0">
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900">Past prep & JD compare</h2>
        <p className="text-xs text-slate-600 mt-0.5">
          Reopen a session or review how your resume matched each role.
        </p>
      </div>

      {sessions.length === 0 ? (
        <p className="px-4 py-10 text-sm text-slate-500 text-center">
          No sessions yet. Generate prep from the Prep tab.
        </p>
      ) : (
        <ul>
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} onOpenSession={onOpenSession} />
          ))}
        </ul>
      )}
    </section>
  );
}
