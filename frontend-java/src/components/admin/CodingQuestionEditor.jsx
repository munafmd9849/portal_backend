import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CODING_LANGUAGES } from '../../coding-engine/constants';
import {
  parseStarterCodesByLang,
  createEmptyStarterCodesByLang,
} from '../../coding-engine/starterCodeStorage';
import { emptyExample, emptyTestCase } from '../../coding-engine/testCaseUtils';
import { parseJudgeLimits, DEFAULT_TIME_LIMIT_SEC, DEFAULT_MEMORY_LIMIT_MB } from '../../coding-engine/judgeLimits';

function parseBulkTestCases(raw) {
  const blocks = String(raw || '')
    .split(/\n---+\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks.map((block, i) => {
    let hidden = false;
    let body = block;
    const hiddenMatch = body.match(/^hidden:\s*(true|false|1|0|yes|no)\s*\n/i);
    if (hiddenMatch) {
      hidden = /true|1|yes/i.test(hiddenMatch[1]);
      body = body.slice(hiddenMatch[0].length);
    }
    const [inputPart, outputPart] = body.split(/\n===\n/);
    return {
      ...emptyTestCase(),
      input: (inputPart || '').trim(),
      expectedOutput: (outputPart || '').trim(),
      hidden,
      label: `Case ${i + 1}`,
      weight: 1,
    };
  }).filter((tc) => tc.input || tc.expectedOutput);
}

export default function CodingQuestionEditor({ question, onChange }) {
  const q = question || {};
  const examples = Array.isArray(q.examples) ? q.examples : [];
  const testCases = Array.isArray(q.testCases) ? q.testCases : [];
  const starterCodes = parseStarterCodesByLang(q.starterCodes ?? q.starterCode);
  const judge = parseJudgeLimits(q);
  const [activeLang, setActiveLang] = useState('javascript');
  const [bulkText, setBulkText] = useState('');

  const patch = (field, value) => onChange({ ...q, [field]: value });

  const patchStarter = (lang, code) => {
    const next = { ...starterCodes, [lang]: code };
    onChange({ ...q, starterCodes: next, starterCode: undefined });
  };

  const updateExample = (idx, field, value) => {
    const next = [...examples];
    next[idx] = { ...next[idx], [field]: value };
    patch('examples', next);
  };

  const updateTestCase = (idx, field, value) => {
    const next = [...testCases];
    next[idx] = { ...next[idx], [field]: value };
    patch('testCases', next);
  };

  return (
    <div className="space-y-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
          Question title
        </label>
        <input
          value={q.text || ''}
          onChange={(e) => patch('text', e.target.value)}
          className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-sm"
          placeholder="e.g. Two Sum"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
          Problem statement
        </label>
        <textarea
          value={q.description || ''}
          onChange={(e) => patch('description', e.target.value)}
          className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium h-36 resize-none"
          placeholder="Describe the task, input format, and what to return..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
          Constraints
        </label>
        <textarea
          value={judge.constraintsText}
          onChange={(e) => patch('constraints', e.target.value)}
          className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-mono h-24 resize-none"
          placeholder={'1 <= n <= 10^5\n-10^9 <= nums[i] <= 10^9'}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
            Time limit (seconds)
          </label>
          <input
            type="number"
            min={0.5}
            max={30}
            step={0.5}
            value={judge.timeLimitSec}
            onChange={(e) => patch('timeLimitSec', Number(e.target.value) || DEFAULT_TIME_LIMIT_SEC)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
          />
          <p className="text-[10px] text-slate-500 px-1">CPU time per test case. Exceeding it is TLE.</p>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
            Memory limit (MB)
          </label>
          <input
            type="number"
            min={16}
            max={1024}
            step={16}
            value={judge.memoryLimitMb}
            onChange={(e) => patch('memoryLimitMb', Number(e.target.value) || DEFAULT_MEMORY_LIMIT_MB)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
          />
          <p className="text-[10px] text-slate-500 px-1">Enforced by Judge0 (MLE). Local fallback only times out.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Examples (shown to students)
          </label>
          <button
            type="button"
            onClick={() => patch('examples', [...examples, emptyExample()])}
            className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add example
          </button>
        </div>
        {examples.map((ex, idx) => (
          <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 relative">
            <button
              type="button"
              onClick={() => patch('examples', examples.filter((_, i) => i !== idx))}
              className="absolute top-3 right-3 text-rose-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Input</span>
                <textarea
                  value={ex.input}
                  onChange={(e) => updateExample(idx, 'input', e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg font-mono text-xs h-16"
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Output</span>
                <textarea
                  value={ex.output}
                  onChange={(e) => updateExample(idx, 'output', e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg font-mono text-xs h-16"
                />
              </div>
            </div>
            <input
              value={ex.explanation || ''}
              onChange={(e) => updateExample(idx, 'explanation', e.target.value)}
              className="w-full p-2 border rounded-lg text-xs"
              placeholder="Explanation (optional)"
            />
          </div>
        ))}
      </div>

      <div className="space-y-3 p-4 bg-white border border-slate-200 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Starter code (per language)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CODING_LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setActiveLang(l.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  activeLang === l.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-slate-500 font-medium">
          Provide a template for each language you may allow students to use. Test cases below are
          shared across all languages.
        </p>
        <textarea
          value={starterCodes[activeLang] || ''}
          onChange={(e) => patchStarter(activeLang, e.target.value)}
          className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl h-52 border border-slate-800"
          placeholder={`${activeLang} starter template...`}
        />
        <button
          type="button"
          onClick={() => patchStarter(activeLang, createEmptyStarterCodesByLang()[activeLang])}
          className="text-[10px] font-bold text-slate-500 hover:text-indigo-600"
        >
          Reset {CODING_LANGUAGES.find((l) => l.id === activeLang)?.label} to default template
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Judge test cases (all languages)
          </label>
          <button
            type="button"
            onClick={() => patch('testCases', [...testCases, emptyTestCase()])}
            className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add case
          </button>
        </div>
        <p className="text-[10px] text-slate-500">
          Hidden cases are not shown to students. Weight is used for partial scoring (like HackerRank).
        </p>
        <div className="p-3 bg-white border border-dashed border-slate-300 rounded-xl space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Bulk paste</label>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="w-full p-2 border rounded font-mono text-[11px] h-20"
            placeholder={'stdin for case 1\n===\nexpected output\n---\nhidden: true\nstdin for case 2\n===\nexpected'}
          />
          <button
            type="button"
            className="text-[10px] font-bold text-indigo-600"
            onClick={() => {
              const parsed = parseBulkTestCases(bulkText);
              if (!parsed.length) return;
              patch('testCases', [...testCases, ...parsed]);
              setBulkText('');
            }}
          >
            Import pasted cases
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {testCases.map((tc, idx) => (
            <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-500">Case {idx + 1}</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[10px]">
                    Weight
                    <input
                      type="number"
                      min={1}
                      className="w-12 border rounded px-1 py-0.5"
                      value={tc.weight || 1}
                      onChange={(e) => updateTestCase(idx, 'weight', Math.max(1, Number(e.target.value) || 1))}
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[10px]">
                    <input
                      type="checkbox"
                      checked={Boolean(tc.hidden)}
                      onChange={(e) => updateTestCase(idx, 'hidden', e.target.checked)}
                    />
                    Hidden
                  </label>
                  <button
                    type="button"
                    onClick={() => patch('testCases', testCases.filter((_, i) => i !== idx))}
                    className="text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                value={tc.input}
                onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                className="w-full p-2 border rounded font-mono h-12"
                placeholder="Input"
              />
              <textarea
                value={tc.expectedOutput}
                onChange={(e) => updateTestCase(idx, 'expectedOutput', e.target.value)}
                className="w-full p-2 border rounded font-mono h-12"
                placeholder="Expected output"
              />
            </div>
          ))}
          {testCases.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Add at least one judge test case.</p>
          )}
        </div>
      </div>
    </div>
  );
}
