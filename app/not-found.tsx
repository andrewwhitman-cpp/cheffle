import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-sage-900 mb-2">404</h1>
      <p className="text-sage-600 mb-8 text-center max-w-md">
        This page doesn&apos;t exist. Maybe the recipe was deleted, or you followed a bad link.
      </p>
      <Link
        href="/"
        className="btn-primary px-6 py-3"
      >
        Go home
      </Link>
    </div>
  );
}
