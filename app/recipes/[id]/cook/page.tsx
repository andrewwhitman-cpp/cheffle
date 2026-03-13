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
      <div className="fixed inset-0 z-[60] bg-sage-900 text-sage-50 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-all">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-sage-800 absolute top-0 left-0 right-0 z-10">
          <div 
            className="h-full bg-terracotta-500 transition-all duration-500 ease-out" 
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} 
          />
        </div>

        {/* Top Header */}
        <div className="flex-none p-4 sm:p-6 flex items-center justify-between">
          <Link
            href={`/recipes/${recipe.id}`}
            className="inline-flex items-center gap-2 text-sage-300 hover:text-white text-sm font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Exit Cook Mode
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold uppercase tracking-widest text-sage-400 font-sans">
              Step {stepIndex + 1} <span className="text-sage-600 mx-1">/</span> {steps.length}
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 md:px-24 overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full text-center">
            <h1 className="text-xl sm:text-2xl text-sage-400 font-serif mb-8 max-w-2xl mx-auto truncate">
              {decodeHtmlEntities(recipe.name)}
            </h1>
            
            <div className="min-h-[40vh] flex flex-col justify-center">
              <p className="text-3xl sm:text-5xl md:text-6xl text-white font-serif leading-tight tracking-tight text-balance">
                {decodeHtmlEntities(currentStep)}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="flex-none p-6 sm:p-8 flex flex-col items-center gap-6">
          <div className="flex items-center gap-4 sm:gap-6 w-full max-w-md justify-between">
            <button
              onClick={goPrev}
              disabled={isFirst}
              className="flex-1 h-14 sm:h-16 rounded-2xl border-2 border-sage-700 text-white font-semibold text-lg hover:bg-sage-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Prev
            </button>
            <button
              onClick={goNext}
              className="flex-1 h-14 sm:h-16 rounded-2xl bg-terracotta-600 text-white font-semibold text-lg hover:bg-terracotta-500 transition-all shadow-[0_8px_30px_-6px_rgba(200,75,49,0.5)] flex items-center justify-center gap-2"
            >
              {isLast ? 'Finish' : 'Next'}
              {!isLast && (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-sage-500 font-sans hidden sm:block">
            Use arrow keys <span className="text-xl leading-none mx-1">← →</span> to navigate
          </p>
        </div>

        {/* Floating Action Button for Chat */}
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="absolute bottom-6 right-6 sm:bottom-12 sm:right-12 w-16 h-16 rounded-full bg-white text-terracotta-600 shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          aria-label="Talk with Cheffle"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={32} height={32} aria-hidden>
            <ellipse cx="16" cy="11" rx="9" ry="3.5" fill="currentColor" />
            <rect x="9" y="11" width="14" height="12" fill="currentColor" />
          </svg>
        </button>
      </div>
    </ProtectedRoute>
  );
}
