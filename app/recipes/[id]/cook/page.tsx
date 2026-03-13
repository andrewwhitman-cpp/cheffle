'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authFetch } from '@/lib/auth-fetch';
import { decodeHtmlEntities, parseInstructionsToSteps } from '@/lib/recipe-display';
import { useRecipeChatContext } from '@/contexts/RecipeChatContext';

interface RecipeIngredient {
  name: string;
  quantity: string;
  unit: string;
}

interface Recipe {
  id: number;
  name: string;
  instructions: string;
  ingredients?: RecipeIngredient[];
  servings?: number | null;
  source_url?: string;
}

export default function CookPage() {
  const params = useParams();
  const router = useRouter();
  const { setCookingContext, setChatOpen } = useRecipeChatContext();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = recipe ? parseInstructionsToSteps(recipe.instructions) : [];
  const stepIndex = steps.length > 0 ? Math.max(0, Math.min(currentStepIndex, steps.length - 1)) : 0;
  const isFirst = stepIndex === 0;
  const isLast = steps.length === 0 || stepIndex === steps.length - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      router.push(`/recipes/${params.id}`);
    } else {
      setCurrentStepIndex((i) => i + 1);
    }
  }, [isLast, params.id, router]);
  const goPrev = useCallback(() => {
    if (!isFirst) setCurrentStepIndex((i) => i - 1);
  }, [isFirst]);

  useEffect(() => {
    if (!params.id) return;
    const fetchRecipe = async () => {
      try {
        const res = await authFetch(`/api/recipes/${params.id}`);

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
      if (e.key === 'ArrowRight') {
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

  useEffect(() => {
    if (!recipe) {
      setCookingContext(null);
      return () => setCookingContext(null);
    }
    const steps = parseInstructionsToSteps(recipe.instructions);
    if (steps.length === 0) {
      setCookingContext(null);
      return () => setCookingContext(null);
    }
    const stepIndex = Math.max(0, Math.min(currentStepIndex, steps.length - 1));
    const currentStepText = steps[stepIndex] || '';
    setCookingContext({
        currentStepIndex: stepIndex,
        currentStepText,
        totalSteps: steps.length,
        ingredients: (recipe.ingredients || []).map((ing) =>
          typeof ing === 'string' ? { name: ing, quantity: '', unit: '' } : ing
        ),
      });
    return () => setCookingContext(null);
  }, [recipe, currentStepIndex, setCookingContext]);

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/recipes/${recipe.id}`}
            className="text-terracotta-600 hover:text-terracotta-700 text-sm font-medium"
          >
            ← Back to recipe
          </Link>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="hidden md:flex w-10 h-10 rounded-lg bg-terracotta-600 text-white hover:bg-terracotta-700 items-center justify-center shrink-0"
            aria-label="Talk with Cheffle"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={24} height={24} className="shrink-0" aria-hidden>
              <ellipse cx="16" cy="11" rx="9" ry="3.5" fill="white" />
              <rect x="9" y="11" width="14" height="12" fill="white" />
            </svg>
          </button>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col">
            <p className="text-xl sm:text-2xl text-sage-700 font-medium mb-1">{decodeHtmlEntities(recipe.name)}</p>
            <p className="text-base sm:text-lg text-sage-500 mb-4">
              Step {stepIndex + 1} of {steps.length}
              {recipe.servings != null && recipe.servings > 0 && (
                <span className="ml-2">· Serves {recipe.servings}</span>
              )}
            </p>

            <div className="bg-white rounded-xl border border-sage-200 p-8 sm:p-12 min-h-[35vh] max-h-[50vh] flex flex-col justify-center overflow-y-auto mb-6">
              <p className="text-2xl sm:text-3xl md:text-4xl text-sage-800 leading-relaxed">
                {decodeHtmlEntities(currentStep)}
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
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
                  className="btn-primary px-6 py-3 text-sm"
                >
                  {isLast ? 'Done cooking' : 'Next'}
                </button>
              </div>
              <p className="text-sm text-sage-500">← → to navigate</p>
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
