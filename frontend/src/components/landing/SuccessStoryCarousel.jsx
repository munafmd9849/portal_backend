/**
 * Landing carousel for published student / alumni success stories.
 */

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { listPublicStories } from '../../services/successStories';

export default function SuccessStoryCarousel() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listPublicStories({ featured: true, limit: 12 });
        const items = (data?.items || []).filter(
          (s) => s.type === 'STUDENT_SUCCESS' || s.type === 'ALUMNI' || s.type === 'PLACEMENT_ACHIEVEMENT' || s.type === 'INTERNSHIP',
        );
        // If no featured student stories, fall back to any published of those types
        if (items.length === 0) {
          const all = await listPublicStories({ limit: 12 });
          const fallback = (all?.items || []).filter(
            (s) =>
              s.type === 'STUDENT_SUCCESS'
              || s.type === 'ALUMNI'
              || s.type === 'PLACEMENT_ACHIEVEMENT'
              || s.type === 'INTERNSHIP',
          );
          if (!cancelled) setStories(fallback);
        } else if (!cancelled) {
          setStories(items);
        }
      } catch {
        if (!cancelled) setStories([]);
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
      <div className="flex justify-center py-12">
        <Loader2 className="w-7 h-7 animate-spin text-amber-700/60" />
      </div>
    );
  }

  if (!stories.length) return null;

  return (
    <section className="px-4 sm:px-8 py-12 max-w-6xl mx-auto" aria-labelledby="success-stories-heading">
      <div className="text-center mb-8">
        <h2 id="success-stories-heading" className="text-2xl sm:text-3xl font-bold text-slate-900">
          Student Success Stories
        </h2>
        <p className="text-sm text-slate-600 mt-2 max-w-xl mx-auto">
          Real placements from our campuses — updated by the placement team.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {stories.map((story) => {
          const cover = story.images?.[0]?.url;
          return (
            <article
              key={story.id}
              className="snap-start shrink-0 w-[280px] sm:w-[300px] rounded-xl border border-amber-200/60 bg-white shadow-sm overflow-hidden flex flex-col"
            >
              <div className="h-36 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center overflow-hidden">
                {cover ? (
                  <img src={cover} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-amber-200">
                    {(story.studentName || story.title || '?').charAt(0)}
                  </span>
                )}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <p className="text-sm font-semibold text-slate-900 leading-snug">{story.title}</p>
                {story.studentName && (
                  <p className="text-xs font-medium text-amber-800 mt-2">{story.studentName}</p>
                )}
                <p className="text-xs text-slate-500 mt-1 tabular-nums">
                  {[story.company, story.jobRole, story.packageCtc].filter(Boolean).join(' · ')}
                </p>
                {story.description && (
                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">{story.description}</p>
                )}
                {(story.campus || story.batch) && (
                  <p className="text-[11px] text-slate-400 mt-auto pt-3">
                    {[story.campus, story.batch].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
