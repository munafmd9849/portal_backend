import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';
import { au } from '../assessment/assessmentUi';

const CLOCK_SIZE = 168;
const CENTER = CLOCK_SIZE / 2;
const HOUR_RADIUS = 58;
const MINUTE_RADIUS = 68;
const HOUR_HAND = 32;
const MINUTE_HAND = 44;

function parseTime(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return { hour12: 12, minute: 0, period: 'AM' };
  }
  const [h24, minute] = value.split(':').map(Number);
  const period = h24 >= 12 ? 'PM' : 'AM';
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, period };
}

function to24h(hour12, minute, period) {
  let h = hour12 % 12;
  if (period === 'PM') h += 12;
  if (period === 'AM' && hour12 === 12) h = 0;
  if (period === 'PM' && hour12 === 12) h = 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatDisplay(value) {
  if (!value) return null;
  const { hour12, minute, period } = parseTime(value);
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

function angleFromPoint(clientX, clientY, rect) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (deg < 0) deg += 360;
  return deg;
}

function hourFromAngle(deg) {
  let h = Math.round(deg / 30) % 12;
  if (h === 0) h = 12;
  return h;
}

function minuteFromAngle(deg) {
  return Math.round(deg / 6) % 60;
}

function handRotation(hour12, minute) {
  return hour12 * 30 + minute * 0.5;
}

function minuteHandRotation(minute) {
  return minute * 6;
}

function PeriodButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-9 py-1 rounded-md text-[11px] font-semibold leading-none transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

export default function ClockTimePicker({ value, onChange, placeholder = 'Select time', id: idProp }) {
  const autoId = useId();
  const id = idProp || autoId;
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const faceRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('hour');
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0, width: 0 });

  const [draft, setDraft] = useState(parseTime(value));

  useEffect(() => {
    if (open) setDraft(parseTime(value));
  }, [open, value]);

  const commitDraft = useCallback(
    (next) => {
      onChange(to24h(next.hour12, next.minute, next.period));
    },
    [onChange]
  );

  const setPeriod = (period) => {
    const next = { ...draft, period };
    setDraft(next);
    commitDraft(next);
  };

  const updatePanelPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelWidth = Math.min(232, window.innerWidth - 16);
    let left = rect.left;
    if (left + panelWidth > window.innerWidth - 8) {
      left = window.innerWidth - panelWidth - 8;
    }
    left = Math.max(8, left);

    const spaceBelow = window.innerHeight - rect.bottom;
    const panelHeight = 268;
    const top =
      spaceBelow >= panelHeight + 8
        ? rect.bottom + 6
        : Math.max(8, rect.top - panelHeight - 6);

    setPanelStyle({ top, left, width: panelWidth });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    updatePanelPosition();
    const onScrollOrResize = () => updatePanelPosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        panelRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleFacePointer = (clientX, clientY) => {
    const rect = faceRef.current?.getBoundingClientRect();
    if (!rect) return;
    const deg = angleFromPoint(clientX, clientY, rect);
    if (mode === 'hour') {
      const hour12 = hourFromAngle(deg);
      const next = { ...draft, hour12 };
      setDraft(next);
      commitDraft(next);
      setMode('minute');
    } else {
      const minute = minuteFromAngle(deg);
      const next = { ...draft, minute };
      setDraft(next);
      commitDraft(next);
    }
  };

  const onFaceClick = (e) => {
    e.preventDefault();
    handleFacePointer(e.clientX, e.clientY);
  };

  const display = formatDisplay(value);
  const hourHandDeg = handRotation(draft.hour12, draft.minute);
  const minuteHandDeg = minuteHandRotation(draft.minute);

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Choose time"
          className="fixed z-[10050] rounded-lg border border-slate-200 bg-white shadow-xl p-3"
          style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setMode('hour')}
                className={`min-w-[2.25rem] px-1.5 py-1 rounded-md text-xl font-semibold tabular-nums transition-colors ${
                  mode === 'hour'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {String(draft.hour12).padStart(2, '0')}
              </button>
              <span className="text-xl font-semibold text-slate-400">:</span>
              <button
                type="button"
                onClick={() => setMode('minute')}
                className={`min-w-[2.25rem] px-1.5 py-1 rounded-md text-xl font-semibold tabular-nums transition-colors ${
                  mode === 'minute'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {String(draft.minute).padStart(2, '0')}
              </button>
            </div>

            <div className="flex flex-col gap-0.5 shrink-0">
              <PeriodButton label="AM" active={draft.period === 'AM'} onClick={() => setPeriod('AM')} />
              <PeriodButton label="PM" active={draft.period === 'PM'} onClick={() => setPeriod('PM')} />
            </div>
          </div>

          <div
            ref={faceRef}
            className="relative mx-auto cursor-pointer select-none touch-none"
            style={{ width: CLOCK_SIZE, height: CLOCK_SIZE }}
            onClick={onFaceClick}
            role="slider"
            aria-valuenow={mode === 'hour' ? draft.hour12 : draft.minute}
            aria-valuemin={mode === 'hour' ? 1 : 0}
            aria-valuemax={mode === 'hour' ? 12 : 59}
            aria-label={mode === 'hour' ? 'Select hour' : 'Select minute'}
          >
            <svg width={CLOCK_SIZE} height={CLOCK_SIZE} className="block">
              <circle
                cx={CENTER}
                cy={CENTER}
                r={CLOCK_SIZE / 2 - 3}
                fill="#f8fafc"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              {Array.from({ length: 12 }, (_, i) => {
                const n = i === 0 ? 12 : i;
                const angle = (n * 30 - 90) * (Math.PI / 180);
                const x = CENTER + Math.cos(angle) * HOUR_RADIUS;
                const y = CENTER + Math.sin(angle) * HOUR_RADIUS;
                const selected = mode === 'hour' && draft.hour12 === n;
                return (
                  <g key={n}>
                    <circle
                      cx={x}
                      cy={y}
                      r={selected ? 11 : 0}
                      fill={selected ? '#4f46e5' : 'transparent'}
                      className="transition-all duration-150"
                    />
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className={`font-medium ${selected ? 'fill-white' : 'fill-slate-600'}`}
                      style={{ fontSize: 11 }}
                    >
                      {n}
                    </text>
                  </g>
                );
              })}
              {mode === 'minute' &&
                Array.from({ length: 12 }, (_, i) => {
                  const minute = i * 5;
                  const angle = (minute * 6 - 90) * (Math.PI / 180);
                  const x = CENTER + Math.cos(angle) * MINUTE_RADIUS;
                  const y = CENTER + Math.sin(angle) * MINUTE_RADIUS;
                  const selected = draft.minute === minute;
                  return (
                    <circle
                      key={minute}
                      cx={x}
                      cy={y}
                      r={selected ? 4 : 1.5}
                      fill={selected ? '#4f46e5' : '#94a3b8'}
                    />
                  );
                })}
              <line
                x1={CENTER}
                y1={CENTER}
                x2={CENTER}
                y2={CENTER - HOUR_HAND}
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                transform={`rotate(${hourHandDeg} ${CENTER} ${CENTER})`}
                className="transition-transform duration-200 ease-out"
              />
              <line
                x1={CENTER}
                y1={CENTER}
                x2={CENTER}
                y2={CENTER - MINUTE_HAND}
                stroke="#4f46e5"
                strokeWidth="1.75"
                strokeLinecap="round"
                transform={`rotate(${minuteHandDeg} ${CENTER} ${CENTER})`}
                className="transition-transform duration-200 ease-out"
              />
              <circle cx={CENTER} cy={CENTER} r="3" fill="#4f46e5" />
            </svg>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <p className="text-[11px] text-slate-500">
              {mode === 'hour' ? 'Pick hour' : 'Pick minute'}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`${au.btnSecondary} text-xs py-1 px-2.5`}
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${au.wizardInput} flex items-center gap-2.5 text-left ${
          open ? 'ring-2 ring-indigo-500/20 border-indigo-500' : ''
        }`}
      >
        <Clock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
        <span className={display ? 'text-slate-900 tabular-nums' : 'text-slate-400'}>
          {display || placeholder}
        </span>
      </button>
      {panel}
    </>
  );
}
