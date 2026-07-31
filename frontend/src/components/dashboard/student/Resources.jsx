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

export default function PlacementResources() {
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
        if (response.note) {
          setError(null);
        }
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
      console.error('AI guidance generation failed:', err);

      let errorMessage = 'Failed to generate guidance. Please try again later.';

      if (err.isNetworkError) {
        errorMessage = err.message || 'Cannot connect to server. Please check if the backend is running.';
      } else if (err.response) {
        const errorData = err.response.data || err.response;
        const errorText = errorData.error || errorData.message || '';

        if (errorText.includes('leaked') || errorText.includes('reported as leaked')) {
          errorMessage = 'Your API key was reported as leaked by Google. Please generate a new API key in Google Cloud Console and update your .env file, then restart the server.';
        } else if (errorText.includes('SERVICE_DISABLED') || errorText.includes('has not been used') || errorText.includes('it is disabled') || errorText.includes('Enable it by visiting')) {
          errorMessage = 'Generative Language API is not enabled for your Google Cloud project. Please enable it and wait 1–2 minutes before retrying.';
        } else if (errorText.includes('authentication') || errorText.includes('API key') || err.status === 401 || err.status === 403) {
          errorMessage = errorData.error || errorData.message || 'AI service authentication failed. Please check your API key configuration.';
        } else if (errorData.errorType === 'RATE_LIMIT_EXCEEDED') {
          errorMessage = errorData.message || 'Too many requests. Please wait 10 minutes before trying again.';
        } else if (errorText.includes('Rate limit') || errorText.includes('Rate limit exceeded') || errorText.includes('quota exceeded') || err.status === 429) {
          if (errorData.error && typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.message && errorData.message.includes('quota')) {
            errorMessage = errorData.message;
          } else {
            errorMessage = 'Google AI API quota or rate limit exceeded. Please wait a few minutes and try again.';
          }
        } else if (errorText.includes('quota') || errorText.includes('unavailable')) {
          errorMessage = errorData.message || errorData.error || 'AI service is temporarily unavailable. Please try again later.';
        } else if (errorText.includes('timeout')) {
          errorMessage = errorData.message || 'Request timed out. Please try again.';
        } else if (errorText.includes('not available') || errorText.includes('not configured')) {
          errorMessage = errorData.message || 'AI service is not configured. Please contact support.';
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else {
          errorMessage = `Error: ${err.status || 'Unknown'} - ${errorText || err.message}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      if (errorMessage) {
        setError(errorMessage);
      }

      if (!guidance) {
        setGuidance(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resources-surface w-full max-w-full min-w-0 overflow-x-hidden space-y-4 sm:space-y-5 pb-6">
      <style>{`
        .resources-surface .spark-float {
          animation: resourcesSpark 2.8s ease-out infinite;
        }
        @keyframes resourcesSpark {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .resources-surface .purpose-card {
          transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms ease, border-color 200ms ease;
        }
        .resources-surface .purpose-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
        }
        .resources-surface .chip-in {
          animation: resourcesChipIn 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes resourcesChipIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .resources-surface .result-in {
          animation: resourcesResultIn 380ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes resourcesResultIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .resources-surface .ask-pulse:not(:disabled):hover .spark-float {
          animation-duration: 1.4s;
        }
        @media (prefers-reduced-motion: reduce) {
          .resources-surface .spark-float,
          .resources-surface .chip-in,
          .resources-surface .result-in {
            animation: none !important;
          }
          .resources-surface .purpose-card:hover {
            transform: none;
          }
        }
      `}</style>

      <section className="relative bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5 min-w-0">
        {!hasSearched && (
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {PURPOSE_CARDS.map(({ icon: Icon, title, blurb, tone }) => (
              <button
                key={title}
                type="button"
                onClick={() => setQuery(title === 'Interview focus' ? SUGGESTIONS[0] : title === 'Resume & profile' ? SUGGESTIONS[3] : title === 'System design' ? SUGGESTIONS[2] : SUGGESTIONS[1])}
                className={`purpose-card text-left rounded-xl border p-2.5 sm:p-3 ${tone}`}
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
            className="w-full min-w-0 pl-9 pr-[5.75rem] sm:pr-28 py-2.5 text-sm rounded-lg border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 text-slate-900 placeholder:text-slate-400 transition-[box-shadow,border-color] duration-200"
            maxLength={500}
            aria-label="Placement guidance question"
          />
          <button
            type="submit"
            className="ask-pulse absolute top-1 right-1 bottom-1 px-3 sm:px-4 rounded-md bg-indigo-600 text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors touch-manipulation inline-flex items-center justify-center gap-1.5 min-w-[4.5rem]"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" tone="white" />
                <span className="hidden sm:inline">Working…</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 spark-float" strokeWidth={1.75} />
                <span>Ask</span>
              </>
            )}
          </button>
        </form>

        {!hasSearched && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuery(s)}
                style={{ animationDelay: `${i * 60}ms` }}
                className="chip-in text-xs px-2.5 py-1.5 rounded-full border border-slate-200 bg-slate-50/90 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-100 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-lg min-w-0">
            <p className="text-sm text-rose-800 break-words">{error}</p>
          </div>
        )}

        {!error && loading && (
          <div className="mt-3 space-y-3 min-w-0">
            <SkeletonCard bodyLines={3} className="border-indigo-100 bg-indigo-50/70" />
            <SkeletonCard bodyLines={4} className="border-indigo-100 bg-indigo-50/70" />
          </div>
        )}
      </section>

      {!hasSearched && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 sm:p-7 text-center min-w-0">
          <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-teal-600">
            <Sparkles className="h-4 w-4 spark-float" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium text-slate-800">Start with a real placement question</p>
          <p className="text-xs mt-1.5 text-slate-500 max-w-md mx-auto">
            Pick a purpose card or suggestion — guidance stays concise so you can act on it in one sitting.
          </p>
        </div>
      )}

      {hasSearched && !loading && !error && guidance && (
        <div className="space-y-3 min-w-0 result-in">
          {guidance.fallbackData && guidance.fallbackData.sections && (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden min-w-0">
              <div className="p-4 sm:p-5">
                <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg min-w-0">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-medium">
                    AI unavailable — verified resources
                  </span>
                  {guidance.fallbackData.note && (
                    <p className="text-sm text-amber-800 mt-2 break-words">{guidance.fallbackData.note}</p>
                  )}
                </div>

                {guidance.fallbackData.title && (
                  <h3 className="text-base font-semibold text-slate-900 mb-4 break-words">{guidance.fallbackData.title}</h3>
                )}

                <div className="space-y-5">
                  {guidance.fallbackData.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800 mb-2 break-words">{section.heading}</h4>
                      <ul className="space-y-2">
                        {section.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-2 min-w-0">
                            <span className="text-indigo-600 mt-0.5 flex-shrink-0 text-sm tabular-nums">{itemIndex + 1}.</span>
                            <div className="min-w-0 overflow-hidden">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium text-sm break-words"
                              >
                                {item.title}
                              </a>
                              {item.url && (
                                <p className="text-xs text-slate-500 mt-0.5 truncate" title={item.url}>{item.url}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {guidance.summary && (
                  <div className="mt-5 pt-4 border-t border-slate-200 min-w-0">
                    <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {guidance.summary}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {guidance.summary && !guidance.fallbackData && (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden min-w-0">
              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2 flex-wrap">
                  {guidance.fallback && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-medium border border-amber-100">
                      Fallback
                    </span>
                  )}
                  {guidance.cached && (
                    <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-xs font-medium border border-teal-100">
                      Cached
                    </span>
                  )}
                  {!guidance.fallback && !guidance.cached && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-xs font-medium border border-indigo-100 inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3" strokeWidth={1.75} />
                      AI generated
                    </span>
                  )}
                </div>
                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap break-words min-w-0">
                  {guidance.summary}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
