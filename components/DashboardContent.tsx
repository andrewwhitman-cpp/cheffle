'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSkillLevelLabel } from '@/lib/skill-levels';
import { authFetch } from '@/lib/auth-fetch';
import SectionSkeleton from '@/components/SectionSkeleton';
import RecipeCard from '@/components/RecipeCard';

interface Recipe {
  id: number;
  name: string;
  description: string;
  prep_time: number;
  cook_time: number;
  servings?: number | null;
  source_url?: string;
  skill_level_adjusted?: string | null;
  created_at?: string;
}

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
  dietary_tags?: string[];
  equipment_required?: string[];
}

export default function DashboardContent() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [preview, setPreview] = useState<ParsedRecipe | null>(null);
  const [saving, setSaving] = useState(false);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [skillLevel, setSkillLevel] = useState<string | null>(null);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await authFetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setSkillLevel(data.skill_level ?? null);
      }
    } catch {
      // ignore
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const fetchRecipes = useCallback(async () => {
    try {
      const res = await authFetch('/api/recipes');
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      }
    } catch (err) {
      console.error('Failed to fetch recipes', err);
    } finally {
      setLoadingRecipes(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
    fetchProfile();
  }, [fetchRecipes, fetchProfile]);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    setParseError('');
    setPreview(null);
    if (!url.trim()) return;

    setParsing(true);
    try {
      const res = await authFetch('/api/recipes/parse', {
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

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const res = await authFetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preview.name,
          description: preview.description,
          ingredients: preview.ingredients,
          instructions: preview.instructions,
          prep_time: preview.prep_time,
          cook_time: preview.cook_time,
          servings: preview.servings ?? null,
          source_url: preview.source_url,
          skill_level_adjusted: preview.skill_level_adjusted ?? null,
          dietary_tags: preview.dietary_tags ?? [],
          equipment_required: preview.equipment_required ?? [],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save');
      }
      const recipe = await res.json();
      setPreview(null);
      setUrl('');
      setRecipes((prev) => [recipe, ...prev]);
      router.push(`/recipes/${recipe.id}`);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setParseError('');
  };

  const recentlyAddedRecipes = [...recipes]
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 8);

  return (
    <ProtectedRoute>
      <div className="px-4 sm:px-6 py-10 md:py-16 max-w-5xl mx-auto">
        {/* Add recipe section (Editorial styled) */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-serif text-sage-900 mb-3">Add a new recipe</h1>
            <p className="text-sage-600">Import from any culinary website to add it to your collection.</p>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-[2rem] p-2 border border-sage-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus-within:border-terracotta-300 focus-within:shadow-[0_8px_30px_rgba(200,75,49,0.08)] transition-all duration-300">
              <form onSubmit={handleParse} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste recipe URL (e.g. Bon Appétit, NYT Cooking)"
                  className="flex-1 min-w-0 px-6 py-4 bg-transparent focus:outline-none text-sage-900 placeholder:text-sage-400 text-lg"
                  disabled={parsing}
                />
                <button
                  type="submit"
                  disabled={parsing || !url.trim()}
                  title={!url.trim() ? 'Paste a recipe URL above to add it' : undefined}
                  className="btn-primary rounded-2xl px-8 py-4 m-1 shrink-0"
                >
                  {parsing ? 'Extracting...' : 'Extract'}
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
                  <button onClick={handleSave} disabled={saving} className="btn-primary">
                    {saving ? 'Saving...' : 'Save to collection'}
                  </button>
                  <button type="button" onClick={handleCancelPreview} className="btn-ghost">
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard widget cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {/* Cooking skill level card - Editorial style */}
          <div className="relative overflow-hidden rounded-2xl border border-sage-800 bg-sage-900 p-8 text-white shadow-none group">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-sage-800/50 blur-2xl group-hover:bg-sage-700/50 transition-colors duration-700" />
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sage-300 mb-4 font-sans">Cooking skill level</p>
              {loadingProfile ? (
                <div className="h-10 w-48 bg-sage-800 rounded animate-pulse" />
              ) : skillLevel ? (
                <p className="text-4xl font-serif font-medium">{getSkillLevelLabel(skillLevel)}</p>
              ) : (
                <p className="text-sage-400 font-serif text-2xl italic">Not yet set</p>
              )}
              <Link href="/profile" className="mt-8 inline-block text-xs uppercase tracking-wider font-semibold text-sage-200 hover:text-white transition-colors border-b border-sage-700 hover:border-sage-300 pb-0.5">
                Update in profile
              </Link>
            </div>
          </div>

          {/* Daily goal card */}
          <div className="rounded-2xl border border-sage-200/60 bg-white p-8 shadow-none group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-terracotta-500" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sage-400 mb-4 font-sans pl-2">Daily Inspiration</p>
            <p className="text-2xl font-serif text-sage-900 leading-tight pl-2">Master a new technique or revisit an old favorite.</p>
            <Link href="/recipes" className="mt-8 inline-block text-xs uppercase tracking-wider font-semibold text-terracotta-600 hover:text-terracotta-700 transition-colors border-b border-terracotta-200 hover:border-terracotta-400 pb-0.5 pl-2">
              Browse collection
            </Link>
          </div>
        </div>

        {/* Recently added */}
        <div>
          <div className="flex justify-between items-end mb-8 border-b border-sage-200/60 pb-4">
            <h2 className="text-3xl font-serif text-sage-900">Recently added</h2>
            <Link href="/recipes" className="text-sm link-accent pb-1">
              View all
            </Link>
          </div>
          {loadingRecipes ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-2xl border border-sage-200/60 bg-sage-50/50 animate-pulse" />
              ))}
            </div>
          ) : recentlyAddedRecipes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sage-300 bg-transparent p-16 text-center">
              <p className="text-2xl font-serif text-sage-800 mb-3">Your collection is empty</p>
              <p className="text-base text-sage-500 font-light">Extract a recipe from a URL above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recentlyAddedRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
