import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Link2, Mail, RefreshCw, X } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../ui/Toast';
import { Spinner } from '../ui/loading';

export default function AssessmentInviteModal({ assessmentId, assessmentTitle, open, onClose }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [invitePath, setInvitePath] = useState(null);
  const [emailsText, setEmailsText] = useState('');
  const [rows, setRows] = useState([]);

  const shareUrl = useMemo(() => {
    if (!invitePath || typeof window === 'undefined') return '';
    return `${window.location.origin}${invitePath}`;
  }, [invitePath]);

  const load = async () => {
    if (!assessmentId) return;
    try {
      setLoading(true);
      const data = await api.getAssessmentInvite(assessmentId);
      setEnabled(Boolean(data.inviteEnabled));
      setInvitePath(data.invitePath);
      setRows(Array.isArray(data.inviteEmails) ? data.inviteEmails : []);
      setEmailsText((data.inviteEmails || []).map((r) => r.email).join('\n'));
    } catch (e) {
      toast?.error(e?.message || 'Failed to load invite settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assessmentId]);

  const save = async ({ regenerateToken = false } = {}) => {
    try {
      setSaving(true);
      const data = await api.updateAssessmentInvite(assessmentId, {
        enabled,
        emails: emailsText,
        regenerateToken,
      });
      setEnabled(Boolean(data.inviteEnabled));
      setInvitePath(data.invitePath);
      setRows(Array.isArray(data.inviteEmails) ? data.inviteEmails : []);
      setEmailsText((data.inviteEmails || []).map((r) => r.email).join('\n'));
      toast?.success(regenerateToken ? 'Link regenerated' : 'Invite settings saved');
    } catch (e) {
      toast?.error(e?.response?.data?.error || e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) {
      toast?.error('Enable invite link and save first');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast?.success('Invite link copied');
    } catch {
      toast?.error('Could not copy link');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Link2 className="w-4 h-4" />
              Shareable invite link
            </div>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{assessmentTitle}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Spinner />
            </div>
          ) : (
            <>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">Enable invite link</div>
                  <div className="text-xs text-slate-500">
                    Only emails on the allowlist can enter and take the exam.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
              </label>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Share URL</div>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl || (enabled ? 'Save to generate link…' : 'Enable invite link first')}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    disabled={!shareUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white disabled:opacity-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => save({ regenerateToken: true })}
                    disabled={saving || !enabled}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    title="Regenerate token (old link stops working)"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Allowed emails (one per line)
                </div>
                <textarea
                  value={emailsText}
                  onChange={(e) => setEmailsText(e.target.value)}
                  rows={8}
                  placeholder={'student1@college.edu\nstudent2@college.edu'}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <p className="text-[11px] text-slate-400">
                  {rows.length} currently saved · statuses update as candidates start/complete
                </p>
                {rows.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-50">
                    {rows.map((r) => (
                      <div key={r.id} className="px-3 py-1.5 flex items-center justify-between text-xs">
                        <span className="text-slate-700 truncate">{r.email}</span>
                        <span className="text-slate-400 uppercase tracking-wide">{r.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => save()}
            disabled={saving || loading}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
