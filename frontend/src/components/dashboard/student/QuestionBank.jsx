import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import api from '../../../services/api';
import { Spinner } from '../../ui/loading';
import RoleTargetPicker from '../../resume/RoleTargetPicker';
import InterviewPrepSession from './interviewPrep/InterviewPrepSession';
import PrepSegments, { prepFieldClass, prepPrimaryBtnClass, prepGhostBtnClass } from './interviewPrep/PrepSegments';
import { labelFormatType, labelQuestionType } from './interviewPrep/labels';

const VIEWS = { HOME: 'home', SESSION: 'session', RESULTS: 'results' };

export default function QuestionBank({ initialSessionId = null, onSessionOpened }) {
  const [meta, setMeta] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [view, setView] = useState(initialSessionId ? VIEWS.SESSION : VIEWS.HOME);
  const [activeSessionId, setActiveSessionId] = useState(initialSessionId);
  const [completedSession, setCompletedSession] = useState(null);

  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [target, setTarget] = useState(null);

  const [difficulty, setDifficulty] = useState('medium');
  const [interviewType, setInterviewType] = useState('MIXED');

  useEffect(() => {
    if (initialSessionId) {
      setActiveSessionId(initialSessionId);
      setView(VIEWS.SESSION);
      onSessionOpened?.();
    }
  }, [initialSessionId, onSessionOpened]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [metaRes, resumeRes] = await Promise.all([
          api.getInterviewPrepMeta(),
          api.getResumes(),
        ]);
        if (!cancelled) {
          setMeta(metaRes);
          const list = Array.isArray(resumeRes) ? resumeRes : (resumeRes?.resumes || []);
          setResumes(list);
          const defaultResume = list.find((r) => r.isDefault) || list[0];
          if (defaultResume) setSelectedResumeId(defaultResume.id);
          if (!list.length) setShowPaste(true);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load prep settings');
      } finally {
        if (!cancelled) {
          setLoadingMeta(false);
          setLoadingResumes(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const buildPayload = useCallback(() => ({
    ...(selectedResumeId ? { resumeId: selectedResumeId } : {}),
    ...(resumeText.trim() ? { resumeText: resumeText.trim() } : {}),
    ...(target?.id ? { jobId: target.id } : {}),
    ...(target?.jobTitle ? { jobTitle: target.jobTitle, targetRole: target.jobTitle } : {}),
    ...(target?.companyName ? { companyName: target.companyName } : {}),
    ...(target?.jobDescription ? { jobDescription: target.jobDescription } : {}),
  }), [selectedResumeId, resumeText, target]);

  const generatePrep = useCallback(async () => {
    if (!target?.jobTitle) {
      setError('Pick a job or enter a role');
      return;
    }
    if (!selectedResumeId && !resumeText.trim()) {
      setError('Select a resume or paste text');
      return;
    }
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.createInterviewPrepSession({
        ...buildPayload(),
        difficulty,
        interviewType,
      });
      if (res.notice && res.source === 'fallback') setNotice(res.notice);
      setActiveSessionId(res.session.id);
      setView(VIEWS.SESSION);
    } catch (err) {
      setError(err.message || 'Could not generate prep');
    } finally {
      setCreating(false);
    }
  }, [buildPayload, difficulty, interviewType, selectedResumeId, resumeText, target]);

  const handleComplete = useCallback((session) => {
    setCompletedSession(session);
    setView(VIEWS.RESULTS);
  }, []);

  const backToHome = useCallback(() => {
    setView(VIEWS.HOME);
    setActiveSessionId(null);
    setCompletedSession(null);
  }, []);

  const difficultyOptions = (meta?.difficulties || []).map((d) => ({ id: d.id, label: d.label }));
  const formatOptions = (meta?.interviewTypes || []).map((t) => ({
    id: t.id,
    label: labelFormatType(t.id),
  }));

  if (loadingMeta) {
    return (
      <div className="flex justify-center py-14">
        <Spinner className="h-6 w-6 text-[#6B8FD6]" />
      </div>
    );
  }

  if (view === VIEWS.SESSION && activeSessionId) {
    return (
      <InterviewPrepSession
        sessionId={activeSessionId}
        onBack={backToHome}
        onComplete={handleComplete}
      />
    );
  }

  if (view === VIEWS.RESULTS && completedSession) {
    return (
      <div className="space-y-3 border border-slate-200 rounded-lg bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Session complete</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {completedSession.jobTitle}
            {completedSession.companyName ? ` · ${completedSession.companyName}` : ''}
            {' · '}
            {completedSession.questions?.length || 0} questions
          </p>
        </div>
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {completedSession.questions?.map((q, i) => (
            <li key={q.id} className="py-2.5">
              <span className="text-xs text-slate-500">{labelQuestionType(q.inputType, q.category)}</span>
              <p className="text-sm font-medium text-slate-900">{q.title}</p>
            </li>
          ))}
        </ul>
        <button type="button" onClick={backToHome} className={prepPrimaryBtnClass}>
          New prep
        </button>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
      <div className="p-4 sm:p-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="prep-resume" className="block text-sm font-medium text-slate-900 mb-1.5">
            Resume
          </label>
          {loadingResumes ? (
            <Spinner className="h-5 w-5 text-slate-600" />
          ) : (
            <div className="space-y-1.5">
              {resumes.length > 0 && (
                <select
                  id="prep-resume"
                  value={selectedResumeId || ''}
                  onChange={(e) => {
                    const id = e.target.value || null;
                    setSelectedResumeId(id);
                    if (id) { setResumeText(''); setShowPaste(false); }
                  }}
                  className={prepFieldClass}
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fileName || r.title || 'Resume'}
                      {r.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              )}
              {!showPaste && resumes.length > 0 && (
                <button type="button" onClick={() => setShowPaste(true)} className={prepGhostBtnClass}>
                  Paste instead
                </button>
              )}
              {(showPaste || !resumes.length) && (
                <textarea
                  value={resumeText}
                  onChange={(e) => {
                    setResumeText(e.target.value);
                    if (e.target.value.trim()) setSelectedResumeId(null);
                  }}
                  rows={3}
                  placeholder="Paste resume text…"
                  className={prepFieldClass}
                />
              )}
            </div>
          )}
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-900 mb-1.5">Target role</span>
          <RoleTargetPicker value={target} onChange={setTarget} />
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
        <div>
          <p className="text-sm font-medium text-slate-900 mb-1.5">Difficulty</p>
          <PrepSegments options={difficultyOptions} value={difficulty} onChange={setDifficulty} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900 mb-1.5">Question type</p>
          <PrepSegments options={formatOptions} value={interviewType} onChange={setInterviewType} />
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        {notice && (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200/80 rounded-md px-3 py-2">
            {notice}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-800 bg-red-50 border border-red-200/80 rounded-md px-3 py-2 flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={generatePrep}
          disabled={creating}
          className={`${prepPrimaryBtnClass} w-full sm:w-auto`}
        >
          {creating ? (
            <>
              <Spinner className="h-4 w-4" />
              Generating…
            </>
          ) : (
            'Generate prep'
          )}
        </button>
      </div>
    </div>
  );
}
