'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-semibold text-sage-900 mb-2">Something went wrong</h1>
      <p className="text-sage-600 mb-8 text-center max-w-md">
        We hit an unexpected error. Please try again.
      </p>
      <button
        onClick={reset}
        className="btn-primary px-6 py-3"
      >
        Try again
      </button>
    </div>
  );
}
