import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { ChevronDown, Lock } from 'lucide-react';

function renderSectionBody(section) {
  if (section.key === 'points') {
    const lines = section.body.split(/\n|(?<=\S)\s*\|\s*(?=\S)/).map((l) => l.trim()).filter(Boolean);
    const bullets = lines.map((line) => line.replace(/^[-•]\s*/, ''));
    if (bullets.length > 1 || section.body.includes('|') || section.body.includes('•')) {
      return (
        <ul className="text-sm text-slate-700 leading-relaxed space-y-1 list-disc pl-4">
          {bullets.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }
  }
  return (
    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap text-pretty">{section.body}</p>
  );
}

export default function AnswerNotesPanel({
  unlocked,
  sections,
  referenceCode,
  monacoLang,
  accentClass = 'border-teal-200 bg-teal-50/40',
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [sections, unlocked]);

  const toggle = () => {
    if (!unlocked) return;
    setOpen((v) => !v);
  };

  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={toggle}
        disabled={!unlocked}
        aria-expanded={open && unlocked}
        className={`w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
          unlocked
            ? `${accentClass} hover:brightness-[0.98] cursor-pointer`
            : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
        }`}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
          {!unlocked ? (
            <>
              <Lock className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
              Answer notes locked
            </>
          ) : (
            'View answer notes'
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-600 shrink-0 transition-transform duration-200 ${
            open && unlocked ? 'rotate-180' : ''
          }`}
        />
      </button>

      {unlocked && open && (
        <div className="mt-3 space-y-4 pl-1">
          {sections.map((section) => (
            <div key={section.key}>
              <h3 className="text-sm font-medium text-slate-900 mb-1">{section.label}</h3>
              {section.key === 'code' || (section.key === 'guide' && referenceCode) ? (
                <div className="rounded-md border border-slate-200 overflow-hidden">
                  <Editor
                    height="180px"
                    language={monacoLang}
                    value={section.key === 'code' ? section.body : referenceCode}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      readOnly: true,
                      scrollBeyondLastLine: false,
                    }}
                    theme="vs-light"
                  />
                </div>
              ) : (
                renderSectionBody(section)
              )}
            </div>
          ))}
          {!sections.length && (
            <p className="text-sm text-slate-500">No notes for this question.</p>
          )}
        </div>
      )}
    </div>
  );
}
