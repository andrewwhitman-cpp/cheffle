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

interface MealPlanEntry {
  id: number;
  plan_date: string;
  meal_type: string;
  recipe_id: number | null;
}

interface ShoppingListItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  purchased: number;
}

interface ShoppingList {
  id: number;
  name: string;
  items: ShoppingListItem[];
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner'] as const;
const MEAL_LABELS: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function DashboardContent() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [preview, setPreview] = useState<ParsedRecipe | null>(null);
  const [saving, setSaving] = useState(false);

  const [todayMeals, setTodayMeals] = useState<MealPlanEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [skillLevel, setSkillLevel] = useState<string | null>(null);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadingShopping, setLoadingShopping] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const todayStr = formatDate(new Date());

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

  const fetchTodayMeals = useCallback(async () => {
    try {
      const doFetch = async (): Promise<MealPlanEntry[]> => {
        const res = await authFetch(`/api/meal-plans?start=${todayStr}&end=${todayStr}`, { cache: 'no-store' });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      };
      let data = await doFetch();
      if (data.length === 0) {
        await new Promise((r) => setTimeout(r, 400));
        data = await doFetch();
      }
      setTodayMeals(data);
    } catch (err) {
      console.error('Failed to fetch meal plan', err);
    } finally {
      setLoadingMeals(false);
    }
  }, [todayStr]);

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

  const fetchShoppingList = useCallback(async () => {
    try {
      const res = await authFetch('/api/shopping-lists?latest=true');
      if (res.ok) {
        const data = await res.json();
        if (data && !Array.isArray(data) && data.items) {
          setShoppingList(data);
        } else {
          setShoppingList(null);
        }
      } else {
        setShoppingList(null);
      }
    } catch (err) {
      console.error('Failed to fetch shopping list', err);
    } finally {
      setLoadingShopping(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayMeals();
    fetchRecipes();
    fetchShoppingList();
    fetchProfile();
  }, [fetchTodayMeals, fetchRecipes, fetchShoppingList, fetchProfile]);

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

  const recipeMap = Object.fromEntries(recipes.map((r) => [r.id, r]));
  const recommendedRecipes = recipes.slice(0, 8);
  const unpurchasedItems = shoppingList?.items?.filter((i) => !i.purchased) ?? [];
  const mealsPlannedCount = todayMeals.filter((e) => e.recipe_id != null).length;

  return (
    <ProtectedRoute>
      <div className="px-6 py-8">
        {/* Add recipe section */}
        <div className="mb-8">
          <form onSubmit={handleParse} className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste recipe URL (e.g. allrecipes.com, bonappetit.com)"
              className="flex-1 px-4 py-3 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 bg-white"
              disabled={parsing}
            />
            <button
              type="submit"
              disabled={parsing || !url.trim()}
              title={!url.trim() ? 'Paste a recipe URL above to add it' : undefined}
              className="px-6 py-3 bg-terracotta-600 text-white rounded-lg hover:bg-terracotta-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
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
            <div className="mt-4 p-6 bg-white border border-sage-200 rounded-lg shadow-sm">
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
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-terracotta-600 text-white rounded-lg hover:bg-terracotta-700 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving...' : 'Save to my recipes'}
                </button>
                <button
                  onClick={handleCancelPreview}
                  className="px-4 py-2 border border-sage-300 text-sage-700 rounded-lg hover:bg-sage-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard widget cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Today's meals card */}
          <div className="rounded-xl border border-sage-200 bg-sage-50/50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-sage-500 mb-3">Today&apos;s meals</p>
            {loadingMeals ? (
              <SectionSkeleton lines={3} />
            ) : (
              <div className="space-y-2">
                {todayMeals.length === 0 ? (
                  <p className="text-sage-500 text-sm">Nothing planned.</p>
                ) : (
                  MEAL_ORDER.map((mealType) => {
                    const entry = todayMeals.find((e) => e.meal_type === mealType);
                    const recipe = entry?.recipe_id ? recipeMap[entry.recipe_id] : null;
                    return (
                      <div key={mealType} className="flex justify-between items-center text-sm gap-2">
                        <span className="text-sage-600 shrink-0">{MEAL_LABELS[mealType]}</span>
                        {recipe ? (
                          <Link
                            href={`/recipes/${recipe.id}`}
                            className="text-terracotta-600 hover:text-terracotta-700 font-medium truncate"
                          >
                            {recipe.name}
                          </Link>
                        ) : (
                          <span className="text-sage-400">—</span>
                        )}
                      </div>
                    );
                  })
                )}
                <Link href="/meal-plan" className="mt-3 inline-block text-xs text-terracotta-600 hover:text-terracotta-700 font-medium">
                  View meal plan →
                </Link>
              </div>
            )}
          </div>

          {/* Cooking skill level card */}
          <div className="rounded-xl border border-sage-200 bg-sage-700 p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-sage-300 mb-3">Cooking skill level</p>
            {loadingProfile ? (
              <div className="h-12 bg-sage-600/50 rounded animate-pulse" />
            ) : skillLevel ? (
              <p className="text-3xl font-bold">{getSkillLevelLabel(skillLevel)}</p>
            ) : (
              <p className="text-sage-300">Not set</p>
            )}
            <Link href="/profile" className="mt-3 inline-block text-xs text-sage-200 hover:text-white font-medium">
              Set in profile →
            </Link>
          </div>

          {/* Daily goal / Shopping list card */}
          <div className="rounded-xl border border-sage-200 bg-cream-200/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-sage-600 mb-3">Daily goal</p>
            {loadingShopping ? (
              <SectionSkeleton lines={2} />
            ) : unpurchasedItems.length === 0 && shoppingList ? (
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                  </svg>
                </span>
                <p className="text-sm font-medium text-sage-800">All items purchased</p>
              </div>
            ) : shoppingList ? (
              <p className="text-sage-700 text-sm">
                {unpurchasedItems.length} item{unpurchasedItems.length !== 1 ? 's' : ''} to buy
              </p>
            ) : (
              <p className="text-sage-600 text-sm">No shopping list yet</p>
            )}
            <Link href="/shopping-list" className="mt-3 inline-block text-xs text-terracotta-600 hover:text-terracotta-700 font-medium">
              View list →
            </Link>
          </div>
        </div>

        {/* Recommended for You */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-sage-900">Recommended for You</h2>
            <Link href="/recipes" className="text-sm text-terracotta-600 hover:text-terracotta-700 font-medium">
              View all
            </Link>
          </div>
          {loadingRecipes ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 rounded-lg border border-sage-200 bg-sage-50 animate-pulse" />
              ))}
            </div>
          ) : recommendedRecipes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-sage-300 bg-sage-50/50 p-12 text-center">
              <p className="text-sage-600 mb-2">No recipes yet.</p>
              <p className="text-sm text-sage-500">Add a recipe from a URL above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
