import React from 'react';
import { X } from 'lucide-react';
import { au } from './assessmentUi';

export function WizardProgress({ step, total }) {
  const pct = total > 0 ? Math.round((step / total) * 100) : 0;
  return (
    <div className="h-1 w-full bg-slate-100 shrink-0" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-full bg-indigo-600 transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function WizardSection({ title, description, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 ${className}`}>
      {(title || description) && (
        <div>
          {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
          {description && <p className="text-sm text-slate-600 mt-1">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function WizardField({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      {label && <label className={au.label}>{label}</label>}
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function ToggleRow({ icon: Icon, label, description, enabled, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/30"
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
        }`}
      >
        <Icon className="w-4 h-4" aria-hidden />
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <span
        className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors ${
          enabled ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

export function ToggleList({ children }) {
  return (
    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
      {children}
    </div>
  );
}

export function WizardFooter({ onBack, backDisabled, children }) {
  return (
    <div className={au.modalFooter}>
      <button
        type="button"
        disabled={backDisabled}
        onClick={onBack}
        className={`${au.btnSecondary} mr-auto disabled:opacity-0`}
      >
        Back
      </button>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function WizardModalHeader({ title, subtitle, onClose, icon: Icon }) {
  return (
    <div className={au.modalHeader}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className={au.modalTitle}>{title}</h2>
          {subtitle && <p className={au.modalSubtitle}>{subtitle}</p>}
        </div>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className={au.closeBtn} aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export function StatHighlight({ label, value, hint, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
      {Icon && (
        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-semibold text-slate-900 tabular-nums">{value}</p>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
