import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Spinner } from '../../../ui/loading';
import api from '../../../../services/api';
import { CODING_LANGUAGES } from '../../../../coding-engine/constants';
import { labelQuestionType, questionTypeAccent } from './labels';
import { prepPrimaryBtnClass } from './PrepSegments';
import ThinkTimer from './ThinkTimer';
import AnswerNotesPanel from './AnswerNotesPanel';

const HEADER_VARIANTS = [
  { key: 'approach', label: 'Approach', prefixes: ['Approach:', 'How to approach:'] },
  { key: 'points', label: 'Points', prefixes: ['Points:', 'Key points:'] },
  { key: 'sample', label: 'Example', prefixes: ['Example:', 'Sample answer:'] },
  { key: 'code', label: 'Solution', prefixes: ['Solution:', 'Reference solution:'] },
];

function parseIdealGuide(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return [];

  const sections = [];
  const allPrefixes = HEADER_VARIANTS.flatMap((h) =>
    h.prefixes.map((prefix) => ({ ...h, prefix })),
  );

  for (const header of allPrefixes) {
    const idx = raw.indexOf(header.prefix);
    if (idx === -1) continue;
    if (sections.some((s) => s.key === header.key)) continue;

    const start = idx + header.prefix.length;
    let end = raw.length;
    for (const other of allPrefixes) {
      if (other.prefix === header.prefix) continue;
      const next = raw.indexOf(other.prefix, start);
      if (next !== -1 && next < end) end = next;
    }
    sections.push({
      key: header.key,
      label: header.label,
      body: raw.slice(start, end).trim(),
    });
  }

  if (sections.length === 0) {
    sections.push({ key: 'guide', label: 'Notes', body: raw });
  }

  return sections.sort((a, b) => {
    const order = ['approach', 'points', 'sample', 'code', 'guide'];
    return order.indexOf(a.key) - order.indexOf(b.key);
  });
}

function extractReferenceCode(idealAnswer = '') {
  const match = String(idealAnswer).match(/(?:Solution:|Reference solution:)\s*([\s\S]*)/i);
  return match?.[1]?.trim() || '';
}

export default function InterviewPrepSession({ sessionId, onBack, onComplete }) {
  const [session, setSession] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState(null);
  const [reviewed, setReviewed] = useState(new Set());
  const [notesUnlocked, setNotesUnlocked] = useState(false);

  const questions = session?.questions || [];
  const currentQ = questions[qIndex];
  const isLast = qIndex >= questions.length - 1;
  const accent = questionTypeAccent(currentQ?.inputType, currentQ?.category);
  const typeLabel = labelQuestionType(currentQ?.inputType, currentQ?.category);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getInterviewPrepSession(sessionId);
      setSession(res.session);
      setQIndex(0);
    } catch (err) {
      setError(err.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (currentQ?.id) {
      setReviewed((prev) => new Set(prev).add(currentQ.id));
    }
  }, [currentQ?.id]);

  useEffect(() => {
    setNotesUnlocked(false);
  }, [currentQ?.id]);

  const handleNotesUnlock = useCallback(() => {
    setNotesUnlocked(true);
  }, []);

  const guideSections = useMemo(
    () => parseIdealGuide(currentQ?.idealAnswer),
    [currentQ?.idealAnswer],
  );

  const referenceCode = useMemo(
    () => (currentQ?.inputType === 'CODING' ? extractReferenceCode(currentQ?.idealAnswer) : ''),
    [currentQ],
  );

  const monacoLang = useMemo(
    () => CODING_LANGUAGES.find((l) => l.id === (currentQ?.language || 'javascript'))?.monaco || 'javascript',
    [currentQ?.language],
  );

  const finishSession = async () => {
    setCompleting(true);
    setError(null);
    try {
      const res = await api.completeInterviewPrepSession(sessionId);
      setSession(res.session);
      onComplete?.(res.session);
    } catch (err) {
      setError(err.message || 'Failed to complete session');
    } finally {
      setCompleting(false);
    }
  };

  const goNext = () => {
    if (isLast) {
      finishSession();
    } else {
      setQIndex((i) => i + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-6 w-6 text-[#6B8FD6]" />
      </div>
    );
  }

  if (!session || !currentQ) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
        {error || 'Session not found'}
        <button type="button" onClick={onBack} className="block mx-auto mt-4 text-[#5A7299] font-medium">
          Go back
        </button>
      </div>
    );
  }

  const sessionDone = session.status === 'COMPLETED';
  const progressPct = ((qIndex + 1) / questions.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-[#5A7299]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <p className="text-sm text-slate-600">
          {qIndex + 1} / {questions.length}
        </p>
      </div>

      <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${accent.progress}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
        <div className={`px-4 py-3 border-b border-slate-100/80 ${accent.headerTint}`}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${accent.badge}`}>
              {typeLabel}
            </span>
            {currentQ.category && (
              <span className="text-xs text-slate-600 capitalize">
                {currentQ.category.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <h2 className="text-base font-semibold text-slate-900 text-wrap-balance">{currentQ.title}</h2>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap text-pretty max-w-prose">
            {currentQ.prompt}
          </p>

          {currentQ.hints && (
            <p className="text-xs text-slate-600 mt-3 max-w-prose italic">{currentQ.hints}</p>
          )}

          {currentQ.inputType === 'CODING' && currentQ.starterCode && (
            <div className="mt-4 rounded-md border border-blue-200/80 overflow-hidden ring-1 ring-blue-100">
              <Editor
                height="160px"
                language={monacoLang}
                value={currentQ.starterCode}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  readOnly: true,
                  scrollBeyondLastLine: false,
                }}
                theme="vs-light"
              />
            </div>
          )}

          <ThinkTimer
            questionKey={currentQ.id}
            onComplete={handleNotesUnlock}
            className="mt-5 max-w-xs mx-auto sm:mx-0"
          />

          <AnswerNotesPanel
            key={currentQ.id}
            unlocked={notesUnlocked}
            sections={guideSections}
            referenceCode={referenceCode}
            monacoLang={monacoLang}
            accentClass={accent.panel}
          />

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <button
            type="button"
            disabled={qIndex === 0}
            onClick={() => setQIndex((i) => Math.max(0, i - 1))}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm text-slate-600 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex flex-wrap gap-2">
            {!isLast && (
              <button
                type="button"
                onClick={goNext}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${prepPrimaryBtnClass}`}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {isLast && !sessionDone && (
              <button
                type="button"
                onClick={finishSession}
                disabled={completing}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 ${prepPrimaryBtnClass}`}
              >
                {completing ? <Spinner className="h-4 w-4" /> : 'Done'}
              </button>
            )}
          </div>
        </div>
      </div>

      {sessionDone && (
        <p className="text-sm text-slate-600">
          {questions.length} questions reviewed for {session.jobTitle} @ {session.companyName}.
        </p>
      )}

      <div className="flex gap-1.5 flex-wrap justify-center sm:justify-start">
        {questions.map((q, i) => {
          const dotAccent = questionTypeAccent(q.inputType, q.category);
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setQIndex(i)}
              className={`h-2 w-2 rounded-full transition-all ${
                i === qIndex ? `${dotAccent.progress} scale-125 ring-2 ring-offset-1 ring-slate-300` :
                reviewed.has(q.id) ? 'bg-slate-400' : 'bg-slate-200'
              }`}
              title={`Q${i + 1}: ${q.title}`}
            />
          );
        })}
      </div>
    </div>
  );
}
