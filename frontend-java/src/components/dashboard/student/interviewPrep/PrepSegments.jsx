import React from 'react';
import { prep, prepSegmentBtnClass, prepSegmentTrackClass } from './prepTheme';

export default function PrepSegments({ options, value, onChange, className = '' }) {
  return (
    <div
      className={`inline-flex flex-wrap gap-0.5 p-0.5 rounded-lg ${prepSegmentTrackClass} ${className}`}
      role="group"
    >
      {options.map((opt) => {
        const id = opt.id ?? opt.value;
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${prepSegmentBtnClass(selected)}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export {
  prepFieldClass,
  prepPrimaryBtnClass,
  prepGhostBtnClass,
  prepSegmentTrackClass,
  prepSegmentBtnClass,
} from './prepTheme';
