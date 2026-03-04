'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSkillLevelLabel } from '@/lib/skill-levels';
import { authFetch } from '@/lib/auth-fetch';
import SectionSkeleton from '@/components/SectionSkeleton';

const SECTION_MAX_H = 'max-h-[220px]';

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
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadingShopping, setLoadingShopping] = useState(true);

  const todayStr = formatDate(new Date());

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
  }, [fetchTodayMeals, fetchRecipes, fetchShoppingList]);

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
  const recentRecipes = recipes.slice(0, 8);
  const unpurchasedItems = shoppingList?.items?.filter((i) => !i.purchased) ?? [];

  const cardClass = 'bg-white border border-sage-200 rounded-lg';
  const sectionHeaderClass = 'flex justify-between items-center mb-3';

  const AddRecipeSection = () => (
    <div className="mb-6">
      <form onSubmit={handleParse} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste recipe URL (e.g. allrecipes.com, bonappetit.com)"
          className="flex-1 px-4 py-3 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
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
      {!url.trim() && !parsing && (
        <p className="mt-1.5 text-sm text-sage-500">Paste a recipe URL above to add it.</p>
      )}
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
  );

  const TodayMealsSection = ({ scrollable = false }: { scrollable?: boolean }) => (
    <div className={scrollable ? `${cardClass} p-4 overflow-y-auto ${SECTION_MAX_H}` : `${cardClass} p-4`}>
      {loadingMeals ? (
        <SectionSkeleton lines={4} />
      ) : (
        <div className="space-y-2">
          {todayMeals.length === 0 ? (
            <p className="text-sage-500">Nothing planned for today.</p>
          ) : (
            MEAL_ORDER.map((mealType) => {
              const entry = todayMeals.find((e) => e.meal_type === mealType);
              const recipe = entry?.recipe_id ? recipeMap[entry.recipe_id] : null;
              return (
                <div key={mealType} className="flex justify-between items-center text-sm gap-4">
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
        </div>
      )}
    </div>
  );

  const ShoppingSection = ({ scrollable = false }: { scrollable?: boolean }) => (
    <div className={scrollable ? `${cardClass} p-4 overflow-y-auto ${SECTION_MAX_H}` : `${cardClass} p-4`}>
      {loadingShopping ? (
        <SectionSkeleton lines={5} />
      ) : (
        <>
          {shoppingList ? (
            <div className="space-y-1.5">
              {unpurchasedItems.length === 0 ? (
                <p className="text-sage-500">All items purchased</p>
              ) : (
                unpurchasedItems.map((item) => (
                  <div key={item.id} className="text-sm text-sage-700 truncate">
                    {item.name}
                    {item.quantity > 0 && (
                      <span className="text-sage-500 ml-1">
                        {item.quantity}
                        {item.unit && ` ${item.unit}`}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              <p className="text-sage-500">No shopping list.</p>
              <Link
                href="/meal-plan"
                className="mt-2 inline-block text-sm text-terracotta-600 hover:text-terracotta-700 font-medium"
              >
                Create one from your meal plan →
              </Link>
            </>
          )}
        </>
      )}
    </div>
  );

  const RecentSection = ({ scrollable = false }: { scrollable?: boolean }) => (
    <div className={scrollable ? `${cardClass} p-4 overflow-y-auto ${SECTION_MAX_H}` : `${cardClass} p-4`}>
      {loadingRecipes ? (
        <SectionSkeleton lines={6} />
      ) : recentRecipes.length === 0 ? (
        <p className="text-sage-500">No recipes yet. Add one above.</p>
      ) : (
        <ul className="space-y-2">
          {recentRecipes.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/recipes/${recipe.id}`}
                className="text-terracotta-600 hover:text-terracotta-700 font-medium"
              >
                {recipe.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-sage-900 mb-6">Home</h1>

        <AddRecipeSection />

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:flex-1 min-w-0">
            <div className={sectionHeaderClass}>
              <h2 className="text-lg font-medium text-sage-900">Today&apos;s meals</h2>
              <Link href="/meal-plan" className="text-sm text-terracotta-600 hover:text-terracotta-700 font-medium">
                View meal plan
              </Link>
            </div>
            <TodayMealsSection />
          </div>
          <aside className="lg:w-96 lg:shrink-0 lg:sticky lg:top-6 space-y-6">
            <div>
              <div className={sectionHeaderClass}>
                <h2 className="text-lg font-medium text-sage-900">Shopping list</h2>
                <Link href="/shopping-list" className="text-sm text-terracotta-600 hover:text-terracotta-700 font-medium">
                  View list
                </Link>
              </div>
              <ShoppingSection scrollable />
            </div>
            <div>
              <div className={sectionHeaderClass}>
                <h2 className="text-lg font-medium text-sage-900">Recently added</h2>
                <Link href="/recipes" className="text-sm text-terracotta-600 hover:text-terracotta-700 font-medium">
                  View all
                </Link>
              </div>
              <RecentSection scrollable />
            </div>
          </aside>
        </div>
      </div>
    </ProtectedRoute>
  );
}
