'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGate } from '@/contexts/AuthGateContext';
import DashboardContent from '@/components/DashboardContent';
import RecipeCard from '@/components/RecipeCard';
import { getDemoRecipesList } from '@/lib/demo-recipes';
import { getSkillLevelLabel } from '@/lib/skill-levels';

interface ParsedRecipe {
  name: string;
  description: string;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  instructions: string;
  prep_time: number;
  cook_time: number;
  servings?: number | null;
  source_url?: string;
  skill_level_adjusted?: string | null;
}

function GuestHome() {
  const { requireAuth } = useAuthGate();
  const [url, setUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [preview, setPreview] = useState<ParsedRecipe | null>(null);

  const demoRecipes = getDemoRecipesList();

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    setParseError('');
    setPreview(null);
    if (!url.trim()) return;

    setParsing(true);
    try {
      const res = await fetch('/api/recipes/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to parse recipe');
      }
      setPreview(data);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse recipe');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = () => {
    requireAuth('save recipes to your collection');
  };

  return (
    <div className="px-4 sm:px-6 py-12 md:py-20 max-w-6xl mx-auto">
      {/* Welcome hero */}
      <div className="mb-16 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-serif text-sage-900 mb-6 leading-tight tracking-tight">
          Your modern,<br className="hidden sm:block" /> AI-native recipe collection
        </h1>
        <p className="text-lg md:text-xl text-sage-600 mb-10 font-light leading-relaxed">
          Curate recipes from anywhere. Chat with AI to adjust portions, dietary needs, or skill level, and follow a beautifully guided cook mode.
        </p>
        <Link href="/register" className="btn-primary inline-block px-8 py-3.5 text-base shadow-[0_8px_20px_-6px_rgba(200,75,49,0.4)]">
          Start your collection
        </Link>
      </div>

      {/* Parse URL form */}
      <div className="mb-24 max-w-2xl mx-auto">
        <div className="bg-white rounded-[2rem] p-2 border border-sage-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <form onSubmit={handleParse} className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste any recipe URL (e.g., Bon Appétit, NYT Cooking)"
              className="flex-1 min-w-0 px-6 py-4 bg-transparent focus:outline-none text-sage-900 placeholder:text-sage-400 text-lg"
              disabled={parsing}
            />
            <button
              type="submit"
              disabled={parsing || !url.trim()}
              className="btn-primary rounded-2xl px-8 py-4 m-1 shrink-0"
            >
              {parsing ? 'Extracting...' : 'Extract recipe'}
            </button>
          </form>
        </div>
        {parseError && (
          <div className="mt-4 p-4 bg-coral-50 border border-coral-200 text-coral-800 rounded-xl text-sm text-center">
            {parseError}
          </div>
        )}
        {preview && (
          <div className="mt-6 card-base animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h3 className="text-2xl font-serif text-sage-900">{preview.name}</h3>
              {preview.skill_level_adjusted && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-terracotta-50 text-terracotta-700 font-sans">
                  Adjusted for {getSkillLevelLabel(preview.skill_level_adjusted)}
                </span>
              )}
            </div>
            {preview.description && (
              <p className="text-base text-sage-600 mb-6 leading-relaxed">{preview.description}</p>
            )}
            {preview.servings != null && preview.servings > 0 && (
              <p className="text-sm font-medium text-sage-500 mb-6 uppercase tracking-wider font-sans">Serves {preview.servings}</p>
            )}
            <div className="flex gap-3 mt-4 pt-6 border-t border-sage-100">
              <button onClick={handleSave} className="btn-primary">
                Save to collection
              </button>
              <button
                type="button"
                onClick={() => { setPreview(null); setParseError(''); }}
                className="btn-ghost"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sample recipes */}
      <div>
        <div className="flex justify-between items-end mb-8 border-b border-sage-200/60 pb-4">
          <h2 className="text-3xl font-serif text-sage-900">Sample recipes</h2>
          <Link href="/recipes" className="text-sm link-accent pb-1">
            View all collection
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {demoRecipes.slice(0, 6).map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <DashboardContent />;
  }

  return <GuestHome />;
}
