import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  Building2,
  Video,
} from 'lucide-react';
import { SkeletonList, Spinner } from '../../ui/loading';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../../services/api';

const FILTER_TABS = [
  { id: 'all', label: 'All Events' },
  { id: 'APPLICATION_DEADLINE', label: 'Deadlines' },
  { id: 'INTERVIEW_DRIVE', label: 'Interview Drives' },
  { id: 'INTERVIEW_SLOT', label: 'Scheduled Slots' },
  { id: 'RESULTS_DECLARED', label: 'Results' },
  { id: 'SCREENING_FINALIZED', label: 'Screening' },
];

const TYPE_BORDER = {
  APPLICATION_DEADLINE: 'border-l-amber-500',
  INTERVIEW_DRIVE: 'border-l-blue-800',
  INTERVIEW_SLOT: 'border-l-blue-800',
  SESSION_START: 'border-l-blue-800',
  SESSION_END: 'border-l-gray-300',
  RESULTS_DECLARED: 'border-l-blue-800',
  SCREENING_FINALIZED: 'border-l-blue-800',
};

const TYPE_BADGE = {
  APPLICATION_DEADLINE: 'bg-amber-50 text-amber-800 border-amber-200',
  INTERVIEW_DRIVE: 'bg-blue-50 text-blue-800 border-blue-200',
  INTERVIEW_SLOT: 'bg-blue-50 text-blue-800 border-blue-200',
  SESSION_START: 'bg-blue-50 text-blue-800 border-blue-200',
  SESSION_END: 'bg-gray-100 text-gray-600 border-gray-200',
  RESULTS_DECLARED: 'bg-gray-50 text-gray-700 border-gray-200',
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

function formatDayHeader(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateBox(iso) {
  try {
    const d = new Date(iso);
    return {
      month: d.toLocaleString('default', { month: 'short' }),
      day: d.getDate(),
    };
  } catch {
    return { month: '---', day: '--' };
  }
}

function typeLabel(type) {
  return (type || '').replace(/_/g, ' ');
}

export default function PlacementCalendar() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';

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

  const counts = useMemo(() => {
    const map = { all: events.length };
    FILTER_TABS.forEach((tab) => {
      if (tab.id !== 'all') {
        map[tab.id] = events.filter((e) => e.type === tab.id).length;
      }
    });
    return map;
  }, [events]);

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

  const activeTabMeta = FILTER_TABS.find((t) => t.id === filter) || FILTER_TABS[0];

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-[1600px] mx-auto overflow-x-hidden">
      <div className="flex justify-center mb-2">
        <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200 inline-flex flex-wrap justify-center gap-2 max-w-full">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 sm:px-5 py-2 rounded-md text-sm font-medium transition-all duration-200 touch-manipulation whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-blue-800 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label} ({counts[tab.id] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">
            {filter === 'all' ? 'All Placement Events' : activeTabMeta.label} ({filtered.length})
          </h3>
          {loading && filtered.length > 0 && (
            <div className="inline-flex items-center gap-2 text-sm text-slate-500 shrink-0">
              <Spinner size="sm" />
              Refreshing…
            </div>
          )}
        </div>

        {loading && filtered.length === 0 ? (
          <SkeletonList rows={5} />
        ) : grouped.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">No placement events in the selected range.</p>
            <p className="text-gray-400 text-xs mt-1">Try a different filter or check back later.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {grouped.map(([day, dayEvents]) => (
              <div key={day}>
                <div className="px-4 sm:px-5 py-2.5 bg-gray-50/80 border-b border-gray-100">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                    {formatDayHeader(dayEvents[0]?.start)}
                  </p>
                </div>
                {dayEvents.map((event) => {
                  const borderClass = TYPE_BORDER[event.type] || 'border-l-gray-300';
                  const badgeClass = TYPE_BADGE[event.type] || 'bg-gray-50 text-gray-600 border-gray-200';
                  const dateBox = formatDateBox(event.start);
                  const isDeadline = event.type === 'APPLICATION_DEADLINE';

                  return (
                    <div
                      key={event.id}
                      className={`group relative bg-white border-l-[4px] ${borderClass} hover:bg-gray-50 transition-colors`}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`${base}/job/${event.jobId}`)}
                        className="w-full text-left p-4 sm:p-5"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex gap-4 min-w-0">
                            <div
                              className={`w-11 h-11 rounded-md flex flex-col items-center justify-center flex-shrink-0 border ${
                                isDeadline
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-blue-800 text-white border-blue-800'
                              }`}
                            >
                              <span className="text-[9px] font-medium uppercase opacity-80">
                                {dateBox.month}
                              </span>
                              <span className="text-base font-semibold leading-none">{dateBox.day}</span>
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-medium rounded border ${badgeClass}`}
                                >
                                  {typeLabel(event.type)}
                                </span>
                                {event.phaseLabel && (
                                  <span className="text-xs text-gray-500 truncate">{event.phaseLabel}</span>
                                )}
                              </div>
                              <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-800 truncate transition-colors">
                                {event.title}
                              </h4>
                              <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                {formatEventDate(event.start)}
                                {event.meta?.isOnline && (
                                  <span className="inline-flex items-center gap-1 text-blue-800 font-medium">
                                    <Video className="w-3 h-3" />
                                    Online
                                  </span>
                                )}
                                {event.meta?.room && !event.meta?.isOnline && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {event.meta.room}
                                  </span>
                                )}
                              </p>
                              {event.meta?.meetingLink && (
                                <a
                                  href={event.meta.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-blue-800 hover:underline font-medium inline-block mt-0.5"
                                >
                                  Open meeting link
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 md:pl-4">
                            <span className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-xs font-medium group-hover:bg-white flex items-center gap-1">
                              View job
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
