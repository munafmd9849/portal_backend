import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2, MapPin, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

const TYPE_STYLES = {
  APPLICATION_DEADLINE: 'bg-amber-50 text-amber-800 border-amber-200',
  INTERVIEW_DRIVE: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  INTERVIEW_SLOT: 'bg-violet-50 text-violet-800 border-violet-200',
  SESSION_START: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  SESSION_END: 'bg-slate-50 text-slate-700 border-slate-200',
  RESULTS_DECLARED: 'bg-violet-50 text-violet-800 border-violet-200',
  SCREENING_FINALIZED: 'bg-blue-50 text-blue-800 border-blue-200',
};

function formatEventDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function PlacementCalendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const from = new Date();
        from.setDate(from.getDate() - 7);
        const data = await api.getPlacementCalendarEvents({
          from: from.toISOString(),
          limit: 300,
        });
        if (!cancelled) setEvents(data?.events || []);
      } catch (e) {
        console.error('Placement calendar load failed', e);
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((e) => e.type === filter);
  }, [events, filter]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((event) => {
      const day = new Date(event.start).toDateString();
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(event);
    });
    return Array.from(map.entries());
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Placement Drive Calendar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Deadlines, interview drives, screening, and results across all active jobs.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="all">All events</option>
          <option value="APPLICATION_DEADLINE">Application deadlines</option>
          <option value="INTERVIEW_DRIVE">Interview drives</option>
          <option value="INTERVIEW_SLOT">Scheduled slots</option>
          <option value="RESULTS_DECLARED">Results declared</option>
          <option value="SCREENING_FINALIZED">Screening finalized</option>
        </select>
      </div>

      {grouped.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          No upcoming placement events in the selected range.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, dayEvents]) => (
            <section key={day} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-widest text-slate-500">
                {day}
              </div>
              <ul className="divide-y divide-slate-100">
                {dayEvents.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/job/${event.jobId}`)}
                      className="w-full text-left px-5 py-4 hover:bg-slate-50 flex items-start gap-4 group"
                    >
                      <div className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${TYPE_STYLES[event.type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {event.type.replace(/_/g, ' ')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 group-hover:text-indigo-700 truncate">{event.title}</p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                          <Clock className="w-3.5 h-3.5" />
                          {formatEventDate(event.start)}
                          {event.meta?.isOnline && (
                            <span className="text-violet-600 font-semibold">· Online</span>
                          )}
                          {event.meta?.room && !event.meta?.isOnline && (
                            <>
                              <span className="text-slate-300">·</span>
                              <MapPin className="w-3.5 h-3.5" />
                              {event.meta.room}
                            </>
                          )}
                          {event.phaseLabel && (
                            <>
                              <span className="text-slate-300">·</span>
                              {event.phaseLabel}
                            </>
                          )}
                        </p>
                        {event.meta?.meetingLink && (
                          <a
                            href={event.meta.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-indigo-600 hover:underline mt-1 inline-block"
                          >
                            Open meeting link
                          </a>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 shrink-0 mt-1" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
