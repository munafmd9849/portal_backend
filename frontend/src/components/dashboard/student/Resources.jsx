import React, { useState } from 'react';
import QuestionBank from './QuestionBank';
import InterviewPrepHistory from './interviewPrep/InterviewPrepHistory';

const TABS = [
  { id: 'prep', label: 'Prep' },
  { id: 'history', label: 'History' },
];

export default function PlacementResources() {
  const [tab, setTab] = useState('prep');
  const [historySessionId, setHistorySessionId] = useState(null);

  const openFromHistory = (sessionId) => {
    setHistorySessionId(sessionId);
    setTab('prep');
  };

  return (
    <div className="resources-surface w-full max-w-full min-w-0 overflow-x-hidden pb-6">
      <div className="border-b border-slate-200 mb-4 flex gap-6">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`pb-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-[#6B8FD6] text-[#3D5278]'
                : 'border-transparent text-slate-500 hover:text-[#5A7299]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'prep' ? (
        <QuestionBank
          initialSessionId={historySessionId}
          onSessionOpened={() => setHistorySessionId(null)}
        />
      ) : (
        <InterviewPrepHistory onOpenSession={openFromHistory} />
      )}
    </div>
  );
}
