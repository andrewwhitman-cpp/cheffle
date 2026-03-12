'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import RecipeCard from '@/components/RecipeCard';
import RecipeCardSkeleton from '@/components/RecipeCardSkeleton';
import { authFetch } from '@/lib/auth-fetch';
import { getSkillLevelLabel } from '@/lib/skill-levels';

const SEARCH_DEBOUNCE_MS = 300;

interface Recipe {
  id: number;
  name: string;
  description: string;
  prep_time: number;
  cook_time: number;
  servings?: number | null;
  source_url?: string;
  skill_level_adjusted?: string | null;
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
}

function RecipesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [loading, setLoading] = useState(true);

  const [url, setUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [preview, setPreview] = useState<ParsedRecipe | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync search query when URL changes (e.g. from header search)
  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  const fetchRecipes = useCallback(async (query: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.append('search', query.trim());

      const res = await authFetch(`/api/recipes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      }
    } catch (err) {
      console.error('Failed to fetch recipes', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const isInitialMount = useRef(true);

  // Initial load (use search param from URL if present)
  useEffect(() => {
    fetchRecipes(initialSearch);
  }, [fetchRecipes, initialSearch]);

  // Debounced live search when user types (skip on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      fetchRecipes(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchRecipes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecipes(searchQuery);
  };

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

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="section-heading text-2xl mb-6">Recipes</h1>

        {/* Add recipe section */}
        <div className="mb-8">
          <form onSubmit={handleParse} className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste recipe URL (e.g. allrecipes.com, bonappetit.com)"
              className="flex-1 px-4 py-3 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 bg-white transition-shadow"
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

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 transition-shadow"
            />
            <button type="submit" className="btn-primary px-6 py-2">
              Search
            </button>
          </div>
        </form>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-sage-300 bg-white shadow-sm">
            <p className="text-sage-600">No recipes found. Paste a URL above to add one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
  );
}

export default function RecipesPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }>
        <RecipesPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
