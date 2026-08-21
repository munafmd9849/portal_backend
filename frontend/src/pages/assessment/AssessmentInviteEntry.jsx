import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Shield, Mail, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/loading';

export default function AssessmentInviteEntry() {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await api.getInviteAssessment(token);
        if (!cancelled) setMeta(data);
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.error || e?.message || 'Invalid invite link');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const startExam = async (e) => {
    e?.preventDefault?.();
    if (!email.trim()) {
      toast?.error('Enter your invited email');
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.claimInviteAccess(token, {
        email: email.trim(),
        fullName: fullName.trim() || undefined,
      });
      if (!res?.accessToken || !res?.assessmentId) {
        throw new Error('Invalid access response');
      }
      api.setAuthTokens(res.accessToken, res.refreshToken);
      toast?.success('Access granted — starting exam');
      window.location.assign(`/assessment/${res.assessmentId}`);
    } catch (err) {
      toast?.error(err?.response?.data?.error || err?.message || 'Could not start assessment');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !meta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <Shield className="w-10 h-10 text-slate-400 mx-auto" />
          <h1 className="text-lg font-semibold text-slate-900">Invite unavailable</h1>
          <p className="text-sm text-slate-600">{error || 'This link is invalid or disabled.'}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            Go to portal home
          </button>
        </div>
      </div>
    );
  }

  const entryBlocked = meta.entryStatus === 'TOO_EARLY' || meta.entryStatus === 'TOO_LATE';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-900 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Secure assessment invite
          </p>
          <h1 className="text-xl font-semibold leading-snug">{meta.title}</h1>
          <p className="text-sm text-slate-300 mt-2">
            {meta.duration} min · {String(meta.type || '').replace(/_/g, ' ')}
          </p>
        </div>

        <div className="px-8 py-6 space-y-5">
          {meta.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{meta.description}</p>
          )}

          {entryBlocked && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
              {meta.entryStatus === 'TOO_EARLY'
                ? 'This assessment has not opened yet. Come back when the entry window starts.'
                : 'The entry window for this assessment has closed.'}
            </div>
          )}

          {!entryBlocked && (
            <form onSubmit={startExam} className="space-y-4">
              <p className="text-sm text-slate-600">
                Enter the email you were invited with. Only allowlisted emails can take this test.
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Full name (optional)
                </span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  placeholder="Your name"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Invited email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 disabled:opacity-60"
              >
                {submitting ? <Spinner size="sm" /> : <ArrowRight className="w-4 h-4" />}
                Start assessment
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
