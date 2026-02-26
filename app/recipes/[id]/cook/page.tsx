'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { decodeHtmlEntities, parseInstructionsToSteps } from '@/lib/recipe-display';

interface Recipe {
  id: number;
  name: string;
  instructions: string;
}

export default function CookPage() {
  const params = useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = recipe ? parseInstructionsToSteps(recipe.instructions) : [];
  const stepIndex = steps.length > 0 ? Math.max(0, Math.min(currentStepIndex, steps.length - 1)) : 0;
  const isFirst = stepIndex === 0;
  const isLast = steps.length === 0 || stepIndex === steps.length - 1;

  const goNext = useCallback(() => {
    if (!isLast) setCurrentStepIndex((i) => i + 1);
  }, [isLast]);
  const goPrev = useCallback(() => {
    if (!isFirst) setCurrentStepIndex((i) => i - 1);
  }, [isFirst]);

  useEffect(() => {
    if (!params.id) return;
    const fetchRecipe = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/recipes/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Recipe not found');

        const data = await res.json();
        setRecipe(data);
        setCurrentStepIndex(0);
      } catch (err: any) {
        setError(err.message || 'Failed to load recipe');
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [params.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center text-sage-600">
          Loading...
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !recipe) {
    return (
      <ProtectedRoute>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="p-4 bg-coral-50 border border-coral-200 text-coral-800 rounded-lg mb-4">
            {error || 'Recipe not found'}
          </div>
          <Link href="/recipes" className="text-terracotta-600 hover:text-terracotta-700">
            ← Back to recipes
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  if (steps.length === 0 && !loading && recipe) {
    return (
      <ProtectedRoute>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <p className="text-sage-600 mb-4">This recipe has no instructions.</p>
          <Link
            href={`/recipes/${recipe.id}`}
            className="text-terracotta-600 hover:text-terracotta-700"
          >
            ← Back to recipe
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  const currentStep = steps[stepIndex];

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <div className="shrink-0 mb-4">
          <Link
            href={`/recipes/${recipe.id}`}
            className="inline-block text-sm text-terracotta-600 hover:text-terracotta-700"
          >
            ← Back to recipe
          </Link>
          <p className="text-xl sm:text-2xl text-sage-700 mt-1 font-medium">{decodeHtmlEntities(recipe.name)}</p>
          <p className="text-base sm:text-lg text-sage-500 mt-1">
            Step {stepIndex + 1} of {steps.length}
          </p>
        </div>

        <div className="shrink-0 mb-6">
          <div className="bg-white rounded-xl border border-sage-200 p-8 sm:p-12 min-h-[35vh] max-h-[50vh] flex flex-col justify-center overflow-y-auto">
            <p className="text-2xl sm:text-3xl md:text-4xl text-sage-800 leading-relaxed">
              {decodeHtmlEntities(currentStep)}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-center gap-3">
          <div className="flex gap-4">
          <button
            onClick={goPrev}
            disabled={isFirst}
            className="px-6 py-3 border border-sage-300 text-sage-700 rounded-lg hover:bg-sage-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition text-sm font-medium"
          >
            Previous
          </button>
          <button
            onClick={goNext}
            disabled={isLast}
            className="px-6 py-3 bg-terracotta-600 text-white rounded-lg hover:bg-terracotta-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
          >
            Next
          </button>
          </div>
          <p className="text-sm text-sage-500">← → or space to navigate</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
