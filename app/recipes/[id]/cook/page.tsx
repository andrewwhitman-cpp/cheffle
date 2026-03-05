'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authFetch } from '@/lib/auth-fetch';
import { decodeHtmlEntities, normalizeInstructions, parseInstructionsToSteps } from '@/lib/recipe-display';
import { useRecipeChat } from '@/hooks/useRecipeChat';
import { useVoiceMode } from '@/hooks/useVoiceMode';
import ConfirmConsumptionModal from '@/components/ConfirmConsumptionModal';

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
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const {
    chatMessages,
    setChatMessages,
    pendingRecipe,
    setPendingRecipe,
    clearPendingRecipe,
    clearChat,
    chatInput,
    setChatInput,
    chatLoading,
    setChatLoading,
  } = useRecipeChat(params.id as string);

  const handleVoiceQuery = useCallback(
    async (query: string) => {
      if (!recipe || !params.id) return;
      setChatMessages((prev) => [...prev, { role: 'user', content: query }]);
      setChatLoading(true);
      setPendingRecipe(null);
      const steps = parseInstructionsToSteps(recipe.instructions);
      const stepIndex = Math.max(0, Math.min(currentStepIndex, steps.length - 1));
      const currentStep = steps[stepIndex] || '';
      try {
        const res = await authFetch(`/api/recipes/${params.id}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            history: chatMessages,
            cookingContext: {
              currentStepIndex: stepIndex,
              currentStepText: currentStep,
              totalSteps: steps.length,
              ingredients: recipe.ingredients || [],
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to get response');
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
        return data.message;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setChatMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
        return null;
      } finally {
        setChatLoading(false);
      }
    },
    [recipe, params.id, chatMessages, currentStepIndex]
  );

  const {
    voiceEnabled,
    setVoiceEnabled,
    isVoiceSupported,
    isListening,
    startListening,
    stopListening,
    speakResponses,
    setSpeakResponses,
  } = useVoiceMode({
    onQueryDetected: async (query, speak, speakEnabled) => {
      const response = await handleVoiceQuery(query);
      if (response && speakEnabled) speak(response);
    },
    continuousMode: true,
  });

  const steps = recipe ? parseInstructionsToSteps(recipe.instructions) : [];
  const stepIndex = steps.length > 0 ? Math.max(0, Math.min(currentStepIndex, steps.length - 1)) : 0;
  const isFirst = stepIndex === 0;
  const isLast = steps.length === 0 || stepIndex === steps.length - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      setShowConfirmModal(true);
    } else {
      setCurrentStepIndex((i) => i + 1);
    }
  }, [isLast]);
  const goPrev = useCallback(() => {
    if (!isFirst) setCurrentStepIndex((i) => i - 1);
  }, [isFirst]);

  const handleConfirmDone = useCallback(() => {
    setShowConfirmModal(false);
    router.push(`/recipes/${params.id}`);
  }, [params.id, router]);

  const handleSkipDone = useCallback(() => {
    setShowConfirmModal(false);
    router.push(`/recipes/${params.id}`);
  }, [params.id, router]);

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

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !recipe) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    setPendingRecipe(null);

    try {
      const stepsForChat = parseInstructionsToSteps(recipe.instructions);
      const stepIdx = Math.max(0, Math.min(currentStepIndex, stepsForChat.length - 1));
      const res = await authFetch(`/api/recipes/${params.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: chatMessages,
          cookingContext: {
            currentStepIndex: stepIdx,
            currentStepText: stepsForChat[stepIdx] || '',
            totalSteps: stepsForChat.length,
            ingredients: recipe.ingredients || [],
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to get response');

      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      if (data.modifiedRecipe) {
        setPendingRecipe(data.modifiedRecipe);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message || 'Something went wrong'}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!pendingRecipe || !recipe) return;

    try {
      const res = await authFetch(`/api/recipes/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pendingRecipe.name,
          description: pendingRecipe.description,
          ingredients: pendingRecipe.ingredients,
          instructions: normalizeInstructions(pendingRecipe.instructions) || pendingRecipe.instructions,
          prep_time: pendingRecipe.prep_time,
          cook_time: pendingRecipe.cook_time,
          servings: pendingRecipe.servings ?? recipe.servings ?? null,
          source_url: recipe.source_url,
          skill_level_adjusted: pendingRecipe.skill_level_adjusted ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to apply');
      }
      clearPendingRecipe();
      const data = await res.json();
      setRecipe(data);
      setCurrentStepIndex(0);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message || 'Failed to apply changes'}` },
      ]);
    }
  };

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
        <div className="mb-6">
          <Link
            href={`/recipes/${recipe.id}`}
            className="text-terracotta-600 hover:text-terracotta-700 text-sm font-medium"
          >
            ← Back to recipe
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Cooking instructions */}
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

          {/* Right: AI Chat */}
          <div className="bg-white rounded-lg border border-sage-200 p-6 flex flex-col lg:h-[calc(100vh-8rem)] lg:sticky lg:top-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="text-lg font-medium text-sage-900">Talk with Cheffle</h2>
              <div className="flex items-center gap-2">
                {chatMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={clearChat}
                    disabled={chatLoading}
                    className="text-sm text-sage-600 hover:text-sage-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    New chat
                  </button>
                )}
                {isVoiceSupported && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    title={voiceEnabled ? 'Disable voice mode' : 'Enable voice mode'}
                    className={`p-2 rounded-lg transition ${
                      voiceEnabled ? 'bg-terracotta-100 text-terracotta-700' : 'bg-sage-100 text-sage-600 hover:bg-sage-200'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                      <path d="M4 10a8 8 0 0 0 16 0v2a8 8 0 0 1-16 0V10z" />
                    </svg>
                  </button>
                  {voiceEnabled && (
                    <label className="flex items-center gap-1.5 text-xs text-sage-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={speakResponses}
                        onChange={(e) => setSpeakResponses(e.target.checked)}
                        className="rounded border-sage-300"
                      />
                      Speak
                    </label>
                  )}
                </div>
                )}
              </div>
            </div>
            <p className="text-sm text-sage-600 mb-4">
              I&apos;m here to help! Ask me to tweak this recipe—add rice, make it vegetarian, double it, or anything else you have in mind.
            </p>
            {voiceEnabled && (
              <div className="mb-4 p-3 bg-terracotta-50 border border-terracotta-200 rounded-lg">
                <div className="flex items-center gap-2">
                  {isListening && (
                    <span className="w-2 h-2 rounded-full bg-terracotta-500 animate-pulse shrink-0" aria-hidden />
                  )}
                  <p className="text-sm text-terracotta-800 flex-1">
                    {isListening
                      ? 'Listening... Say "Chef" then your question.'
                      : 'Say "Chef" then your question, or tap the mic to speak.'}
                  </p>
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    disabled={chatLoading}
                    className="p-2 rounded-lg bg-white border border-terracotta-300 text-terracotta-700 hover:bg-terracotta-50 disabled:opacity-50 shrink-0"
                    title={isListening ? 'Stop listening' : 'Tap to speak'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                      <path d="M4 10a8 8 0 0 0 16 0v2a8 8 0 0 1-16 0V10z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            {!isVoiceSupported && (
              <p className="text-xs text-sage-500 mb-2">Voice mode is not supported in this browser. Use Chrome or Safari for hands-free help.</p>
            )}

            <div className="space-y-3 mb-4 flex-1 min-h-0 overflow-y-auto">
              {chatMessages.length === 0 && !chatLoading && (
                <p className="text-sm text-sage-500 italic py-4">
                  What would you like to change? Just ask!
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-terracotta-50 text-sage-900 ml-4'
                      : 'bg-sage-100 text-sage-800 mr-4'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))}
              {chatLoading && (
                <div className="p-3 rounded-lg bg-sage-100 text-sage-600 text-sm">
                  <span className="animate-pulse">Cheffle is thinking...</span>
                </div>
              )}
            </div>

            {pendingRecipe && (
              <div className="mb-4 p-4 bg-cream-100 border border-cream-300 rounded-lg shrink-0">
                <p className="text-sm font-medium text-sage-800 mb-2">I&apos;ve got some changes for you!</p>
                <p className="text-xs text-sage-600 mb-3">Apply to update the recipe and cooking steps.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleApplyChanges}
                    className="btn-primary px-4 py-2 text-sm"
                  >
                    Use these changes
                  </button>
                  <button
                    onClick={clearPendingRecipe}
                    className="px-4 py-2 border border-sage-300 text-sage-700 rounded-lg hover:bg-sage-50 text-sm font-medium"
                  >
                    Start over
                  </button>
                </div>
              </div>
            )}

            {showConfirmModal && recipe && (
              <ConfirmConsumptionModal
                recipeId={recipe.id}
                recipeName={decodeHtmlEntities(recipe.name)}
                ingredients={recipe.ingredients || []}
                onConfirm={handleConfirmDone}
                onSkip={handleSkipDone}
              />
            )}

            <form onSubmit={handleChatSubmit} className="flex gap-2 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="What would you like to change?"
                className="flex-1 px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 text-sage-900 placeholder:text-sage-400"
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
