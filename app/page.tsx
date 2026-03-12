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
    <div className="px-6 py-8 max-w-6xl mx-auto">
      {/* Welcome hero */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-sage-900 mb-2">
          Your AI-native recipe collection
        </h1>
        <p className="text-sage-600 max-w-xl mb-4">
          Add recipes from any URL, chat with AI to customize them for your skill level,
          and follow guided cook mode step by step.
        </p>
        <Link href="/register" className="btn-primary inline-block px-5 py-2 text-sm">
          Sign up free
        </Link>
      </div>

      {/* Parse URL form */}
      <div className="mb-8">
        <form onSubmit={handleParse} className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a recipe URL to try it out"
            className="flex-1 px-4 py-3 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 bg-white transition-shadow"
            disabled={parsing}
          />
          <button
            type="submit"
            disabled={parsing || !url.trim()}
            className="btn-primary px-6 py-3"
          >
            {parsing ? 'Parsing...' : 'Try it'}
          </button>
        </form>
        {parseError && (
          <div className="mt-2 p-3 bg-coral-50 border border-coral-200 text-coral-800 rounded-lg text-sm">
            {parseError}
          </div>
        )}
        {preview && (
          <div className="mt-4 card-base">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-sage-900">{preview.name}</h3>
              {preview.skill_level_adjusted && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-terracotta-100 text-terracotta-800">
                  Adjusted for {getSkillLevelLabel(preview.skill_level_adjusted)}
                </span>
              )}
            </div>
            {preview.description && (
              <p className="text-sm text-sage-600 mb-4 line-clamp-2">{preview.description}</p>
            )}
            {preview.servings != null && preview.servings > 0 && (
              <p className="text-sm text-sage-500 mb-2">Serves {preview.servings}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} className="btn-primary">
                Save to my recipes
              </button>
              <button
                type="button"
                onClick={() => { setPreview(null); setParseError(''); }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sample recipes */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="section-heading">Sample recipes</h2>
          <Link href="/recipes" className="text-sm link-accent">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
