'use client';

import { useState } from 'react';
import { useAuthGate } from '@/contexts/AuthGateContext';
import { authFetch } from '@/lib/auth-fetch';
import DiscoverQuestionStep, { DiscoverQuestion } from '@/components/DiscoverQuestionStep';
import DiscoverRecipeCard from '@/components/DiscoverRecipeCard';
import { SerpRecipe } from '@/lib/serp-api';

export default function DiscoverPage() {
  const { requireAuth } = useAuthGate();

  const [text, setText] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [questions, setQuestions] = useState<DiscoverQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [recipes, setRecipes] = useState<SerpRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addingUrl, setAddingUrl] = useState<string | null>(null);
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());

  const currentQuestion = questions[currentQuestionIndex];

  const submitToAI = async (currentText: string, currentAnswers: Record<string, string | string[]>) => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/recipes/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentText, answers: currentAnswers }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to get discovery suggestions');

      if (data.complete) {
        setRecipes(data.recipes || []);
      } else {
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setCurrentQuestionIndex(0);
        } else {
          throw new Error('AI returned incomplete but provided no questions.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!requireAuth('use AI recipe discovery')) return;
    setAnswers({});
    setQuestions([]);
    setRecipes([]);
    submitToAI(text.trim(), {});
  };

  const handleAnswerSubmit = (answer: string | string[]) => {
    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      // Go to next question in the current batch
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Batch complete, ask AI what's next
      submitToAI(text, newAnswers);
    }
  };

  const handleAddRecipe = async (recipe: SerpRecipe) => {
    if (!requireAuth('save recipes to your collection')) return;
    setAddingUrl(recipe.link);
    setError('');
    try {
      // 1. Parse
      const parseRes = await authFetch('/api/recipes/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: recipe.link }),
      });
      if (!parseRes.ok) {
        const pd = await parseRes.json();
        throw new Error(pd.message || 'Failed to parse recipe from source');
      }
      const parsedData = await parseRes.json();

      // 2. Save
      const saveRes = await authFetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsedData,
          source_url: recipe.link,
        }),
      });

      if (!saveRes.ok) {
        const sd = await saveRes.json();
        throw new Error(sd.message || 'Failed to save recipe');
      }

      setAddedUrls((prev) => new Set(prev).add(recipe.link));
    } catch (err: any) {
      setError(err.message || 'Failed to add recipe');
    } finally {
      setAddingUrl(null);
    }
  };

  const reset = () => {
    setText('');
    setAnswers({});
    setQuestions([]);
    setRecipes([]);
    setAddedUrls(new Set());
    setError('');
  };

  return (
    <div className="min-h-full py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif text-sage-900 tracking-tight mb-4">
          Discover Recipes
        </h1>
        <p className="text-lg text-sage-600 font-light max-w-2xl mx-auto">
          Tell Cheffle what you&apos;re craving, what ingredients you need to use, or any dietary goals. We&apos;ll find the perfect recipe for you.
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-coral-50 border border-coral-200 text-coral-800 rounded-xl text-center text-sm">
          {error}
        </div>
      )}

      {recipes.length > 0 ? (
        <div className="animate-in fade-in duration-500">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-serif text-sage-900">Found {recipes.length} matching recipes</h2>
              {addedUrls.size > 0 && (
                <a
                  href="/recipes"
                  className="text-sm font-medium text-sage-600 hover:text-terracotta-600 transition-colors flex items-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                  View {addedUrls.size} added
                </a>
              )}
            </div>
            <button onClick={reset} className="text-sm font-medium text-sage-500 hover:text-sage-900 transition-colors">
              Start over
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe, i) => (
              <DiscoverRecipeCard
                key={i}
                recipe={recipe}
                onAdd={handleAddRecipe}
                isAdding={addingUrl === recipe.link}
                isAdded={addedUrls.has(recipe.link)}
              />
            ))}
          </div>
        </div>
      ) : currentQuestion ? (
        <div className="relative">
          <button onClick={reset} className="absolute -top-12 left-0 text-sm font-medium text-sage-400 hover:text-sage-800 transition-colors flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Start over
          </button>
          <DiscoverQuestionStep
            question={currentQuestion}
            onSubmit={handleAnswerSubmit}
          />
        </div>
      ) : (
        <form onSubmit={handleInitialSubmit} className="max-w-2xl mx-auto bg-white rounded-3xl p-3 border border-sage-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus-within:border-terracotta-300 focus-within:shadow-[0_8px_30px_rgba(200,75,49,0.08)] transition-all duration-300">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., Quick high-protein dinner using chicken..."
              className="flex-1 min-w-0 px-6 py-4 bg-transparent focus:outline-none text-sage-900 placeholder:text-sage-400 text-lg"
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="btn-primary rounded-2xl px-8 py-4 m-1 shrink-0 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Thinking...
                </>
              ) : (
                'Find Recipes'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
