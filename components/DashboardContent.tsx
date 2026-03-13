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
      <div className="px-4 sm:px-6 py-8 max-w-6xl mx-auto">
        {/* Add recipe section */}
        <div className="mb-8">
          <form onSubmit={handleParse} className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste recipe URL (e.g. allrecipes.com, bonappetit.com)"
              className="flex-1 min-w-0 px-4 py-3 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 bg-white transition-shadow"
              disabled={parsing}
            />
            <button
              type="submit"
              disabled={parsing || !url.trim()}
              title={!url.trim() ? 'Paste a recipe URL above to add it' : undefined}
              className="btn-primary px-6 py-3"
            >
              {parsing ? 'Parsing...' : 'Add recipe'}
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
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Save to my recipes'}
                </button>
                <button type="button" onClick={handleCancelPreview} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard widget cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Cooking skill level card - sage accent */}
          <div className="rounded-xl border border-sage-600 bg-sage-700 p-6 text-white shadow-sm">
            <p className="card-label mb-3 text-sage-300">Cooking skill level</p>
            {loadingProfile ? (
              <div className="h-12 bg-sage-600/50 rounded animate-pulse" />
            ) : skillLevel ? (
              <p className="text-3xl font-bold">{getSkillLevelLabel(skillLevel)}</p>
            ) : (
              <p className="text-sage-300">Not set</p>
            )}
            <Link href="/profile" className="mt-3 inline-block text-xs text-sage-200 hover:text-white font-medium transition-colors">
              Set in profile →
            </Link>
          </div>

          {/* Daily goal card */}
          <div className="card-base border-l-4 border-l-cream-400">
            <p className="card-label mb-3 text-sage-600">Daily goal</p>
            <p className="text-sage-700 text-sm">Cook something delicious today.</p>
            <Link href="/recipes" className="mt-3 inline-block text-xs link-accent">
              Browse recipes →
            </Link>
          </div>
        </div>

        {/* Recently added */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="section-heading">Recently added</h2>
            <Link href="/recipes" className="text-sm link-accent">
              View all
            </Link>
          </div>
          {loadingRecipes ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 rounded-lg border border-sage-200 bg-sage-50 animate-pulse" />
              ))}
            </div>
          ) : recentlyAddedRecipes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-sage-300 bg-white p-12 text-center shadow-sm">
              <p className="text-sage-600 mb-2">No recipes yet.</p>
              <p className="text-sm text-sage-500">Add a recipe from a URL above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
