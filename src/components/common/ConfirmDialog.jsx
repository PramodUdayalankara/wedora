import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action? This operation cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger', 'primary', 'gold'
  loading = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '0.5rem 0' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: variant === 'danger' ? 'var(--status-danger-bg)' : 'var(--status-warning-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <AlertTriangle
            size={22}
            color={variant === 'danger' ? 'var(--status-danger-text)' : 'var(--status-warning-text)'}
          />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--text-main)', fontSize: '0.92rem', lineHeight: 1.5 }}>{message}</p>
        </div>
      </div>
    </Modal>
  );
};
