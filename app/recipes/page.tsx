'use client';

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGate } from '@/contexts/AuthGateContext';
import RecipeCard from '@/components/RecipeCard';
import RecipeCardSkeleton from '@/components/RecipeCardSkeleton';
import { authFetch } from '@/lib/auth-fetch';
import { getSkillLevelLabel, SKILL_LEVELS } from '@/lib/skill-levels';
import { getDemoRecipesList } from '@/lib/demo-recipes';

const SEARCH_DEBOUNCE_MS = 300;

const TIME_PRESETS = [
  { label: 'Under 30 min', value: '30' },
  { label: '30–60 min', value: '60' },
  { label: 'Over 60 min', value: '' },
];

const DIETARY_OPTIONS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free',
  'nut-free', 'keto', 'paleo', 'low-carb',
];

interface Recipe {
  id: number | string;
  name: string;
  description: string;
  prep_time: number;
  cook_time: number;
  servings?: number | null;
  source_url?: string;
  skill_level_adjusted?: string | null;
  is_favorite?: boolean;
  dietary_tags?: string[];
  equipment_required?: string[];
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

function RecipesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const initialSearch = searchParams.get('search') ?? '';
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [loading, setLoading] = useState(!!user);

  const [url, setUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [preview, setPreview] = useState<ParsedRecipe | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter state
  const [maxTotalTime, setMaxTotalTime] = useState(searchParams.get('max_total_time') ?? '');
  const [skillFilter, setSkillFilter] = useState(searchParams.get('skill_level') ?? '');
  const [dietaryFilter, setDietaryFilter] = useState(searchParams.get('dietary') ?? '');
  const [favoriteFilter, setFavoriteFilter] = useState(searchParams.get('favorite') === '1');
  const [equipmentMatch, setEquipmentMatch] = useState(searchParams.get('equipment_match') === '1');
  const [collectionFilter, setCollectionFilter] = useState(searchParams.get('collection') ?? '');
  const [tagFilter, setTagFilter] = useState(searchParams.get('tag') ?? '');
  const [showFilters, setShowFilters] = useState(false);

  // Collections and tags for filter dropdowns
  const [collections, setCollections] = useState<Array<{ id: number; name: string; recipe_count: number }>>([]);
  const [tags, setTags] = useState<Array<{ id: number; name: string; recipe_count: number }>>([]);

  const demoRecipes = useMemo(() => getDemoRecipesList(), []);

  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    if (!user) return;
    authFetch('/api/collections').then((r) => r.ok ? r.json() : []).then(setCollections).catch(() => {});
    authFetch('/api/tags').then((r) => r.ok ? r.json() : []).then(setTags).catch(() => {});
  }, [user]);

  const fetchRecipes = useCallback(async (query: string) => {
    if (!user) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.append('search', query.trim());
      if (maxTotalTime) params.append('max_total_time', maxTotalTime);
      if (skillFilter) params.append('skill_level', skillFilter);
      if (dietaryFilter) params.append('dietary', dietaryFilter);
      if (favoriteFilter) params.append('favorite', '1');
      if (equipmentMatch) params.append('equipment_match', '1');
      if (collectionFilter) params.append('collection', collectionFilter);
      if (tagFilter) params.append('tag', tagFilter);

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
  }, [user, maxTotalTime, skillFilter, dietaryFilter, favoriteFilter, equipmentMatch, collectionFilter, tagFilter]);

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (user) fetchRecipes(initialSearch);
  }, [fetchRecipes, initialSearch, user]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!user) return;

    const timer = setTimeout(() => {
      fetchRecipes(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchRecipes, user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) fetchRecipes(searchQuery);
  };

  const displayedRecipes: Recipe[] = user ? recipes : (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return demoRecipes;
    return demoRecipes.filter(
      (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
    );
  })();

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    setParseError('');
    setPreview(null);
    if (!url.trim()) return;

    setParsing(true);
    try {
      const fetchFn = user ? authFetch : fetch;
      const res = await fetchFn('/api/recipes/parse', {
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
    if (!user) {
      requireAuth('save recipes to your collection');
      return;
    }
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

  const clearFilters = () => {
    setMaxTotalTime('');
    setSkillFilter('');
    setDietaryFilter('');
    setFavoriteFilter(false);
    setEquipmentMatch(false);
    setCollectionFilter('');
    setTagFilter('');
  };

  const hasActiveFilters = maxTotalTime || skillFilter || dietaryFilter || favoriteFilter || equipmentMatch || collectionFilter || tagFilter;

  const handleFavoriteToggle = async (recipeId: number | string, currentFav: boolean) => {
    try {
      const res = await authFetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !currentFav }),
      });
      if (res.ok) {
        setRecipes((prev) =>
          prev.map((r) => r.id === recipeId ? { ...r, is_favorite: !currentFav } : r)
        );
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="section-heading text-2xl mb-6">
          {user ? 'Recipes' : 'Sample Recipes'}
        </h1>

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
              {parsing ? 'Parsing...' : user ? 'Add recipe' : 'Try it'}
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

        {/* Search + Filters */}
        <div className="mb-6 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
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
            {user && (
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-terracotta-50 border-terracotta-300 text-terracotta-700'
                    : 'border-sage-300 text-sage-600 hover:bg-sage-50'
                }`}
              >
                Filters{hasActiveFilters ? ' *' : ''}
              </button>
            )}
          </form>

          {user && showFilters && (
            <div className="bg-white border border-sage-200 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap gap-4">
                {/* Time filter */}
                <div className="min-w-[140px]">
                  <label className="block text-xs font-medium text-sage-600 mb-1">Total time</label>
                  <select
                    value={maxTotalTime}
                    onChange={(e) => setMaxTotalTime(e.target.value)}
                    className="w-full px-3 py-1.5 border border-sage-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-terracotta-500"
                  >
                    <option value="">Any time</option>
                    {TIME_PRESETS.map((p) => (
                      <option key={p.value || 'over60'} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {/* Skill filter */}
                <div className="min-w-[160px]">
                  <label className="block text-xs font-medium text-sage-600 mb-1">Skill level</label>
                  <select
                    value={skillFilter}
                    onChange={(e) => setSkillFilter(e.target.value)}
                    className="w-full px-3 py-1.5 border border-sage-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-terracotta-500"
                  >
                    <option value="">Any level</option>
                    {SKILL_LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>

                {/* Dietary filter */}
                <div className="min-w-[140px]">
                  <label className="block text-xs font-medium text-sage-600 mb-1">Dietary</label>
                  <select
                    value={dietaryFilter}
                    onChange={(e) => setDietaryFilter(e.target.value)}
                    className="w-full px-3 py-1.5 border border-sage-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-terracotta-500"
                  >
                    <option value="">Any dietary</option>
                    {DIETARY_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Collection filter */}
                {collections.length > 0 && (
                  <div className="min-w-[140px]">
                    <label className="block text-xs font-medium text-sage-600 mb-1">Collection</label>
                    <select
                      value={collectionFilter}
                      onChange={(e) => setCollectionFilter(e.target.value)}
                      className="w-full px-3 py-1.5 border border-sage-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-terracotta-500"
                    >
                      <option value="">All collections</option>
                      {collections.map((c) => (
                        <option key={c.id} value={String(c.id)}>{c.name} ({c.recipe_count})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tag filter */}
                {tags.length > 0 && (
                  <div className="min-w-[140px]">
                    <label className="block text-xs font-medium text-sage-600 mb-1">Tag</label>
                    <select
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      className="w-full px-3 py-1.5 border border-sage-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-terracotta-500"
                    >
                      <option value="">All tags</option>
                      {tags.map((t) => (
                        <option key={t.id} value={String(t.id)}>{t.name} ({t.recipe_count})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-sage-700">
                  <input
                    type="checkbox"
                    checked={favoriteFilter}
                    onChange={(e) => setFavoriteFilter(e.target.checked)}
                    className="rounded border-sage-300 text-terracotta-600 focus:ring-terracotta-500"
                  />
                  Favorites only
                </label>
                <label className="flex items-center gap-2 text-sm text-sage-700">
                  <input
                    type="checkbox"
                    checked={equipmentMatch}
                    onChange={(e) => setEquipmentMatch(e.target.checked)}
                    className="rounded border-sage-300 text-terracotta-600 focus:ring-terracotta-500"
                  />
                  Only recipes I can make
                </label>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm text-terracotta-600 hover:text-terracotta-800 underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        ) : displayedRecipes.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-sage-300 bg-white shadow-sm">
            <p className="text-sage-600">
              {user ? 'No recipes found. Paste a URL above to add one.' : 'No matching sample recipes.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onFavoriteToggle={user ? handleFavoriteToggle : undefined}
              />
            ))}
          </div>
        )}
      </div>
  );
}

export default function RecipesPage() {
  return (
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
  );
}
