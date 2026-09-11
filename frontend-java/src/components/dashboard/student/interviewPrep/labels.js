export const FORMAT_TYPE_LABELS = {
  CONCEPTUAL: 'Conceptual',
  SITUATIONAL: 'Situational',
  CODING: 'Coding',
  MIXED: 'Mixed',
  ORAL: 'Conceptual',
};

const SITUATIONAL_CATEGORIES = new Set(['behavioural', 'behavioral', 'situational', 'scenario']);

export function labelFormatType(type) {
  return FORMAT_TYPE_LABELS[String(type || '').toUpperCase()] || type;
}

export function labelQuestionType(inputType, category) {
  if (String(inputType || '').toUpperCase() === 'CODING') return 'Coding';
  const cat = String(category || '').toLowerCase();
  if (SITUATIONAL_CATEGORIES.has(cat)) return 'Situational';
  return 'Conceptual';
}

/** Periwinkle-blue family accents per question kind */
export function questionTypeAccent(inputType, category) {
  const kind = labelQuestionType(inputType, category);
  if (kind === 'Coding') {
    return {
      badge: 'bg-[#DCE6F5] text-[#2D4268]',
      headerTint: 'bg-[#EEF2F9]',
      panel: 'border-[#C5D2E8] bg-[#F4F6FB]',
      progress: 'bg-[#5A7EC4]',
    };
  }
  if (kind === 'Situational') {
    return {
      badge: 'bg-[#E3EBF8] text-[#3D5278]',
      headerTint: 'bg-[#F0F4FA]',
      panel: 'border-[#D8E0EE] bg-[#F7F9FC]',
      progress: 'bg-[#7B9ECE]',
    };
  }
  return {
    badge: 'bg-[#E8EEF8] text-[#3D5278]',
    headerTint: 'bg-[#F4F6FB]',
    panel: 'border-[#D8E0EE] bg-[#F4F6FB]/80',
    progress: 'bg-[#6B8FD6]',
  };
}

/** @deprecated use labelQuestionType */
export function labelInputType(type, category) {
  return labelQuestionType(type, category);
}
