import React from 'react';
import { X } from 'lucide-react';
import { au } from './assessmentUi';

/**
 * Minimal modal shell for assessment / mock-interview flows.
 */
export default function AssessmentModal({
  open = true,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  className = '',
  bodyClassName = '',
  closeLabel = 'Close',
}) {
  if (!open) return null;

  const sizeClass = size === 'lg' ? au.modalLg : au.modal;

  return (
    <div
      className={size === 'full' ? au.backdropPanel : au.backdropLg}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`${size === 'full' ? au.modalFull : sizeClass} ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'assessment-modal-title' : undefined}
      >
        {(title || onClose) && (
          <div className={au.modalHeader}>
            <div className="min-w-0 pr-4">
              {title && (
                <h2 id="assessment-modal-title" className={au.modalTitle}>
                  {title}
                </h2>
              )}
              {subtitle && <p className={au.modalSubtitle}>{subtitle}</p>}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={au.closeBtn}
                aria-label={closeLabel}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className={`${au.modalBody} ${bodyClassName}`}>{children}</div>

        {footer && <div className={au.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}
