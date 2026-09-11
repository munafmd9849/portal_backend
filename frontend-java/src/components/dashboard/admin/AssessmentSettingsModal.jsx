import React, { useState } from 'react';
import { Trash2, Save, AlertTriangle } from 'lucide-react';
import { Spinner } from '../../ui/loading';
import api from '../../../services/api';
import { useToast } from '../../ui/Toast';
import AssessmentModal from '../../assessment/AssessmentModal';
import { au } from '../../assessment/assessmentUi';
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
  getJoinWindowSettings,
  joinWindowSummary,
} from '../../../utils/assessmentEntryWindow';

export default function AssessmentSettingsModal({ assessment, onClose, onUpdate }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const initialJoin = getJoinWindowSettings(assessment);
  const [formData, setFormData] = useState({
    title: assessment.title || '',
    duration: assessment.duration || 60,
    startTime: toDatetimeLocalValue(assessment.startTime),
    endTime: toDatetimeLocalValue(assessment.endTime),
    joinOpensMinutesBeforeStart: initialJoin.opensMinutesBeforeStart,
    joinClosesMinutesAfterStart: initialJoin.closesMinutesAfterStart,
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      const startIso = fromDatetimeLocalValue(formData.startTime);
      const endIso = fromDatetimeLocalValue(formData.endTime);
      if (startIso && endIso && new Date(endIso) <= new Date(startIso)) {
        toast.error('End time must be after start time');
        setLoading(false);
        return;
      }
      await api.updateAssessment(assessment.id, {
        title: formData.title,
        duration: formData.duration,
        startTime: startIso,
        endTime: endIso,
        joinOpensMinutesBeforeStart: formData.joinOpensMinutesBeforeStart,
        joinClosesMinutesAfterStart: formData.joinClosesMinutesAfterStart,
      });
      toast.success('Assessment updated successfully');
      onUpdate?.();
      onClose?.();
    } catch (error) {
      toast.error(error.message || 'Failed to update assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await api.deleteAssessment(assessment.id);
      toast.success('Assessment deleted permanently');
      onUpdate?.();
      onClose?.();
    } catch (error) {
      toast.error(error.message || 'Failed to delete assessment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AssessmentModal
      title="Assessment settings"
      subtitle={assessment.title}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={au.btnSecondary}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={loading} className={au.btnPrimary}>
            {loading ? (
              <Spinner size="sm" tone="white" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save changes
          </button>
        </>
      }
    >
      <div>
        <label className={au.label}>Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={au.input}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={au.label}>Start time</label>
          <input
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className={au.input}
          />
        </div>
        <div>
          <label className={au.label}>End time</label>
          <input
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            className={au.input}
          />
        </div>
      </div>

      <div className={`${au.panelMuted} p-4 space-y-3`}>
        <p className={au.sectionLabel}>Join window</p>
        <p className="text-xs text-slate-500">Adjust when students can enter after publish.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Opens (min before start)</label>
            <input
              type="number"
              min={0}
              value={formData.joinOpensMinutesBeforeStart}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  joinOpensMinutesBeforeStart: parseInt(e.target.value, 10) || 0,
                })
              }
              className={au.input}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Closes (min after start)</label>
            <input
              type="number"
              min={0}
              value={formData.joinClosesMinutesAfterStart}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  joinClosesMinutesAfterStart: parseInt(e.target.value, 10) || 0,
                })
              }
              className={au.input}
            />
          </div>
        </div>
        {formData.startTime && (
          <p className="text-xs text-slate-600">
            {joinWindowSummary({
              ...assessment,
              startTime: fromDatetimeLocalValue(formData.startTime),
              endTime: fromDatetimeLocalValue(formData.endTime),
              config: JSON.stringify({
                joinWindow: {
                  opensMinutesBeforeStart: formData.joinOpensMinutesBeforeStart,
                  closesMinutesAfterStart: formData.joinClosesMinutesAfterStart,
                },
              }),
            })}
          </p>
        )}
      </div>

      <div>
        <label className={au.label}>Duration (minutes)</label>
        <input
          type="number"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value, 10) || 0 })}
          className={au.input}
        />
      </div>

      <div className="pt-2 border-t border-slate-200">
        {showDeleteConfirm ? (
          <div className={`${au.panelMuted} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-slate-700">Delete this assessment permanently?</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className={au.btnSecondary}>
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={loading} className={au.btnDangerSolid}>
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowDeleteConfirm(true)} className={`${au.btnDanger} w-full`}>
            <Trash2 className="w-4 h-4" />
            Delete assessment
          </button>
        )}
      </div>
    </AssessmentModal>
  );
}
