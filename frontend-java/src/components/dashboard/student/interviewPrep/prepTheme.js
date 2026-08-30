/**
 * Interview prep palette — soft periwinkle / powder blue.
 * True blue-violet tint; avoids Tailwind sky (cyan) and heavy indigo.
 */
export const prep = {
  surface: 'bg-[#F4F6FB]',
  surfaceHover: 'bg-[#EEF2F9]',
  surfaceActive: 'bg-[#E8EEF8]',
  border: 'border-[#D8E0EE]',
  borderHover: 'border-[#C5D2E8]',
  borderFocus: 'border-[#8FA8D4]',
  ring: 'focus:ring-[#8FA8D4]/30',
  accent: 'bg-[#6B8FD6]',
  accentHover: 'hover:bg-[#5A7EC4]',
  accentText: 'text-[#3D5278]',
  accentTextMuted: 'text-[#5A7299]',
  accentSoft: 'bg-[#E3EBF8]',
  accentSoftHover: 'hover:bg-[#D8E4F5]',
  accentIcon: 'text-[#6B8FD6]',
  shadow: 'shadow-[#6B8FD6]/15',
  spinner: 'text-[#6B8FD6]',
};

export const prepSegmentTrackClass = `inline-flex gap-0.5 p-0.5 rounded-lg ${prep.surface} border ${prep.border}`;

export function prepSegmentBtnClass(selected) {
  return selected
    ? `${prep.accent} text-white shadow-sm ${prep.shadow}`
    : `${prep.accentText} hover:text-[#2D4268] ${prep.accentSoftHover}`;
}

export const prepFieldClass = `w-full rounded-lg border ${prep.border} bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 ${prep.ring} ${prep.borderFocus}`;

export const prepPrimaryBtnClass = `inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${prep.accent} text-white text-sm font-medium ${prep.accentHover} disabled:opacity-50 transition-colors shadow-sm ${prep.shadow}`;

export const prepGhostBtnClass =
  'text-xs text-[#5A7299] hover:text-[#3D5278] underline-offset-2 hover:underline';
