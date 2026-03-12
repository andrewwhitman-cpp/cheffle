'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureDescription: string;
}

export default function AuthRequiredModal({
  isOpen,
  onClose,
  featureDescription,
}: AuthRequiredModalProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  const returnUrl = encodeURIComponent(pathname || '/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sage-900/50">
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        aria-describedby="auth-modal-description"
      >
        <h2
          id="auth-modal-title"
          className="text-lg font-semibold text-sage-900 mb-2"
        >
          Create a free account
        </h2>
        <p id="auth-modal-description" className="text-sage-600 mb-6">
          Sign up or log in to {featureDescription}. It only takes a moment.
        </p>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Maybe later
          </button>
          <Link
            href={`/login?returnUrl=${returnUrl}`}
            onClick={onClose}
            className="btn-secondary text-center"
          >
            Log in
          </Link>
          <Link
            href={`/register?returnUrl=${returnUrl}`}
            onClick={onClose}
            className="btn-primary text-center"
          >
            Sign up free
          </Link>
        </div>
      </div>
    </div>
  );
}
