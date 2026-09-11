import React from 'react';
import LoadingPanel from './LoadingPanel';

/**
 * Full-page loading shell — auth boot, route guards, standalone pages.
 */
export default function LoadingPage({ title = 'Loading…', subtitle }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6 bg-slate-50/50">
      <LoadingPanel
        title={title}
        subtitle={subtitle}
        showSubtitle={Boolean(subtitle)}
        minHeight=""
      />
    </div>
  );
}
