'use client';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const confirmButtonClass =
    variant === 'danger'
      ? 'px-4 py-2 bg-coral-600 text-white rounded-lg hover:bg-coral-700 font-medium'
      : 'px-4 py-2 bg-terracotta-600 text-white rounded-lg hover:bg-terracotta-700 font-medium';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sage-900/50">
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
      >
        <h2 id="confirm-modal-title" className="text-lg font-semibold text-sage-900 mb-2">
          {title}
        </h2>
        <p id="confirm-modal-description" className="text-sage-600 mb-6">
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-sage-300 text-sage-700 rounded-lg hover:bg-sage-50 font-medium"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className={confirmButtonClass}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
