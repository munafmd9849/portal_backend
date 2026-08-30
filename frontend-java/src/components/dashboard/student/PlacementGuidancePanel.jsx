import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import {
  Sparkles,
  Target,
  FileText,
  MessageSquare,
  Layers,
} from 'lucide-react';
import api from '../../../services/api';
import { Spinner, SkeletonCard } from '../../ui/loading';

const PURPOSE_CARDS = [
  {
    icon: Target,
    title: 'Interview focus',
    blurb: 'DSA, HR rounds, and company-style prep paths.',
    tone: 'bg-teal-50 text-teal-700 border-teal-100/80',
  },
  {
    icon: FileText,
    title: 'Resume & profile',
    blurb: 'Tighten bullets, projects, and how you present impact.',
    tone: 'bg-orange-50 text-orange-700 border-orange-100/80',
  },
  {
    icon: Layers,
    title: 'System design',
    blurb: 'Freshers-friendly concepts you can explain clearly.',
    tone: 'bg-violet-50 text-violet-700 border-violet-100/80',
  },
  {
    icon: MessageSquare,
    title: 'Behavioral stories',
    blurb: 'Structure answers so interviewers trust your narrative.',
    tone: 'bg-cyan-50 text-cyan-800 border-cyan-100/80',
  },
];

const SUGGESTIONS = [
  'DSA interview prep for product companies',
  'How to answer behavioral questions',
  'System design basics for freshers',
  'Resume tips for SDE roles',
];

export default function PlacementGuidancePanel() {
  const [query, setQuery] = useState('');
  const [guidance, setGuidance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Please enter a topic or question.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Query must be at least 2 characters long.');
      return;
    }
    if (trimmed.length > 500) {
      setError('Query is too long. Maximum 500 characters allowed.');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setGuidance(null);

    try {
      const response = await api.getPlacementGuidance(trimmed);
      if (response.source === 'duckduckgo_fallback' || response.source === 'static_fallback') {
        setGuidance({
          summary: response.guidance || '',
          keyTopics: [],
          recommendedResources: [],
          practiceSuggestions: [],
          nextSteps: [],
          fallback: true,
          fallbackData: response,
        });
      } else if (response.success === false && response.errorType === 'RATE_LIMIT_EXCEEDED') {
        setError(response.message || 'Too many requests. Please wait 10 minutes before trying again.');
        setLoading(false);
        return;
      } else if (response.guidance && typeof response.guidance === 'string') {
        setGuidance({
          summary: response.guidance,
          keyTopics: [],
          recommendedResources: [],
          practiceSuggestions: [],
          nextSteps: [],
          fallback: response.fallback || false,
          cached: response.cached || false,
        });
      } else if (response.summary) {
        setGuidance(response);
      } else {
        setGuidance({
          summary: typeof response === 'string' ? response : JSON.stringify(response),
          keyTopics: [],
          recommendedResources: [],
          practiceSuggestions: [],
          nextSteps: [],
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to generate guidance. Please try again later.');
      setGuidance(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="relative bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5 min-w-0">
        {!hasSearched && (
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {PURPOSE_CARDS.map(({ icon: Icon, title, blurb, tone }) => (
              <button
                key={title}
                type="button"
                onClick={() =>
                  setQuery(
                    title === 'Interview focus'
                      ? SUGGESTIONS[0]
                      : title === 'Resume & profile'
                        ? SUGGESTIONS[3]
                        : title === 'System design'
                          ? SUGGESTIONS[2]
                          : SUGGESTIONS[1],
                  )
                }
                className={`text-left rounded-xl border p-2.5 sm:p-3 ${tone}`}
              >
                <Icon className="h-3.5 w-3.5 mb-1.5 opacity-90" strokeWidth={1.75} />
                <p className="text-xs font-semibold text-slate-800">{title}</p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">{blurb}</p>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleGenerate} className="relative min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. DSA interview prep for product companies"
            className="w-full min-w-0 pl-9 pr-[5.75rem] sm:pr-28 py-2.5 text-sm rounded-lg border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 text-slate-900 placeholder:text-slate-400"
            maxLength={500}
            aria-label="Placement guidance question"
          />
          <button
            type="submit"
            className="absolute top-1 right-1 bottom-1 px-3 sm:px-4 rounded-md bg-indigo-600 text-white text-sm font-medium disabled:opacity-60 inline-flex items-center justify-center gap-1.5 min-w-[4.5rem]"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" tone="white" />
                <span className="hidden sm:inline">Working…</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Ask</span>
              </>
            )}
          </button>
        </form>

        {!hasSearched && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuery(s)}
                className="text-xs px-2.5 py-1.5 rounded-full border border-slate-200 bg-slate-50/90 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-lg">
            <p className="text-sm text-rose-800">{error}</p>
          </div>
        )}

        {!error && loading && (
          <div className="mt-3 space-y-3">
            <SkeletonCard bodyLines={3} className="border-indigo-100 bg-indigo-50/70" />
          </div>
        )}
      </section>

      {hasSearched && !loading && !error && guidance?.summary && (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 sm:p-5">
          <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{guidance.summary}</div>
        </section>
      )}
    </>
  );
}
