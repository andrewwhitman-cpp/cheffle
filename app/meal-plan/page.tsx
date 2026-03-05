'use client';

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authFetch } from '@/lib/auth-fetch';
import { computeShoppingList } from '@/lib/shopping-list';
import ShoppingListModal, { type ShoppingListItem } from '@/components/ShoppingListModal';
import RecipeCombobox from '@/components/RecipeCombobox';

interface Recipe {
  id: number;
  name: string;
  servings?: number | null;
  ingredients?: Array<{ name: string; quantity: string; unit: string }>;
}

interface MealPlanEntry {
  id: number;
  user_id: number;
  plan_date: string;
  meal_type: string;
  recipe_id: number | null;
  created_at: string;
  updated_at: string;
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;
const MEAL_LABELS: Record<string, string> = { breakfast: 'B', lunch: 'L', dinner: 'D' };
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

function entriesEqual(a: MealPlanEntry[], b: MealPlanEntry[]): boolean {
  if (a.length !== b.length) return false;
  const key = (e: MealPlanEntry) => `${e.plan_date}:${e.meal_type}:${e.recipe_id ?? ''}`;
  const aKeys = new Set(a.map(key));
  const bKeys = new Set(b.map(key));
  if (aKeys.size !== bKeys.size) return false;
  for (const k of aKeys) if (!bKeys.has(k)) return false;
  return true;
}

function getMonthRange(viewDate: Date): { startStr: string; endStr: string } {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return {
    startStr: formatDate(first),
    endStr: formatDate(last),
  };
}

function buildCalendarCells(viewDate: Date): { date: Date | null; isCurrentMonth: boolean }[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  const cells: { date: Date | null; isCurrentMonth: boolean }[] = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push({ date: null, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      cells.push({ date: null, isCurrentMonth: false });
    }
  }
  return cells;
}

export default function MealPlanPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [savedEntries, setSavedEntries] = useState<MealPlanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [inventory, setInventory] = useState<{ id: number; name: string; quantity: number; unit: string }[]>([]);
  const [activePopover, setActivePopover] = useState<{ dateStr: string; mealType: string } | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const pendingNavigateRef = useRef<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const [viewDate, setViewDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const { startStr, endStr } = getMonthRange(viewDate);
  const calendarCells = buildCalendarCells(viewDate);
  const dirty = !entriesEqual(entries, savedEntries);

  const fetchRecipes = useCallback(async () => {
    const res = await authFetch('/api/recipes');
    if (res.ok) {
      const data = await res.json();
      setRecipes(data.map((r: Recipe & { ingredients?: unknown }) => ({
        id: r.id,
        name: r.name,
        servings: r.servings,
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      })));
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    const res = await authFetch('/api/inventory');
    if (res.ok) {
      const data = await res.json();
      setInventory(data);
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    const doFetch = async (): Promise<{ data: MealPlanEntry[]; ok: boolean }> => {
      const res = await authFetch(`/api/meal-plans?start=${startStr}&end=${endStr}`, { cache: 'no-store' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError((errData as { message?: string }).message || 'Failed to load meal plan');
        return { data: [], ok: false };
      }
      const data = await res.json();
      return { data: Array.isArray(data) ? data : [], ok: true };
    };
    let result = await doFetch();
    if (result.ok && result.data.length === 0) {
      await new Promise((r) => setTimeout(r, 400));
      result = await doFetch();
    }
    if (result.ok) setError('');
    setEntries(result.data);
    setSavedEntries(result.data);
  }, [startStr, endStr]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      await Promise.all([fetchRecipes(), fetchInventory(), fetchEntries()]);
      setLoading(false);
    };
    load();
  }, [fetchRecipes, fetchInventory, fetchEntries]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const getEntry = (dateStr: string, mealType: string): MealPlanEntry | undefined =>
    entries.find((e) => e.plan_date === dateStr && e.meal_type === mealType);

  const persistEntryImmediate = useCallback(
    async (planDate: string, mealType: string, recipeId: number | null) => {
      setError('');
      try {
        if (recipeId == null) {
          await authFetch(`/api/meal-plans?plan_date=${encodeURIComponent(planDate)}&meal_type=${encodeURIComponent(mealType)}`, { method: 'DELETE' });
        } else {
          const res = await authFetch('/api/meal-plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan_date: planDate, meal_type: mealType, recipe_id: recipeId }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to save');
          }
        }
        const res = await authFetch(`/api/meal-plans?start=${startStr}&end=${endStr}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setEntries(data);
          setSavedEntries(data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      }
    },
    [startStr, endStr]
  );

  const updateEntryLocal = (planDate: string, mealType: string, recipeId: number | null) => {
    setEntries((prev) => {
      const rest = prev.filter((e) => !(e.plan_date === planDate && e.meal_type === mealType));
      if (recipeId == null) {
        setActivePopover(null);
        return rest;
      }
      const newEntry: MealPlanEntry = {
        id: -1,
        user_id: 0,
        plan_date: planDate,
        meal_type: mealType,
        recipe_id: recipeId,
        created_at: '',
        updated_at: '',
      };
      setActivePopover(null);
      persistEntryImmediate(planDate, mealType, recipeId);
      return [...rest, newEntry].sort(
        (a, b) =>
          a.plan_date.localeCompare(b.plan_date) ||
          (MEAL_TYPES.indexOf(a.meal_type as (typeof MEAL_TYPES)[number]) -
            MEAL_TYPES.indexOf(b.meal_type as (typeof MEAL_TYPES)[number]))
      );
    });
  };

  const persistEntries = useCallback(async (): Promise<boolean> => {
    setError('');
    try {
      for (const entry of entries) {
        if (entry.recipe_id == null) continue;
        const res = await authFetch('/api/meal-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan_date: entry.plan_date,
            meal_type: entry.meal_type,
            recipe_id: entry.recipe_id,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to save');
        }
      }
      const existingDates = new Set(entries.map((e) => `${e.plan_date}:${e.meal_type}`));
      const toDelete = savedEntries.filter(
        (e) =>
          e.plan_date >= startStr &&
          e.plan_date <= endStr &&
          !existingDates.has(`${e.plan_date}:${e.meal_type}`)
      );
      if (entries.length === 0 && toDelete.length > 0) {
      } else {
        for (const e of toDelete) {
          await authFetch(`/api/meal-plans?id=${e.id}`, { method: 'DELETE' });
        }
      }
      const res = await authFetch(`/api/meal-plans?start=${startStr}&end=${endStr}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
        setSavedEntries(data);
      }
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      return false;
    }
  }, [entries, savedEntries, startStr, endStr]);

  const handleSaveClick = () => {
    if (!dirty) return;
    setShowSavePrompt(true);
  };

  const openShoppingListModal = () => {
    const mealEntries = entries.filter((e) => e.recipe_id != null).map((e) => ({
      id: e.id,
      plan_date: e.plan_date,
      meal_type: e.meal_type,
      recipe_id: e.recipe_id,
    }));
    const recipeList = recipes.filter((r) =>
      mealEntries.some((m) => m.recipe_id === r.id)
    );
    const invList = inventory.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
    }));
    const items = computeShoppingList(mealEntries, invList, recipeList);
    setShowShoppingModal(true);
  };

  const handleCreateShoppingList = () => {
    setShowSavePrompt(false);
    openShoppingListModal();
  };

  const handleSaveWithoutList = async () => {
    setShowSavePrompt(false);
    const ok = await persistEntries();
    if (ok && pendingNavigateRef.current) {
      window.location.href = pendingNavigateRef.current;
      pendingNavigateRef.current = null;
    }
  };

  const handleCancelPrompt = () => {
    setShowSavePrompt(false);
    pendingNavigateRef.current = null;
  };

  const handleShoppingListSave = async (items: ShoppingListItem[]) => {
    setError('');
    try {
      const res = await authFetch('/api/shopping-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Meal plan ${formatDisplayDate(startStr)} – ${formatDisplayDate(endStr)}`,
          items: items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            from_recipe_id: i.from_recipe_id,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save shopping list');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save shopping list');
      return;
    }
    setShowShoppingModal(false);
    await persistEntries();
    if (pendingNavigateRef.current) {
      window.location.href = pendingNavigateRef.current;
      pendingNavigateRef.current = null;
    }
  };

  const handleShoppingListSkip = async () => {
    setShowShoppingModal(false);
    await persistEntries();
    if (pendingNavigateRef.current) {
      window.location.href = pendingNavigateRef.current;
      pendingNavigateRef.current = null;
    }
  };

  const prevMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const goToThisMonth = () => {
    const d = new Date();
    setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const shoppingItems = (() => {
    if (!showShoppingModal) return [];
    const mealEntries = entries.filter((e) => e.recipe_id != null).map((e) => ({
      id: e.id,
      plan_date: e.plan_date,
      meal_type: e.meal_type,
      recipe_id: e.recipe_id,
    }));
    const recipeList = recipes.filter((r) =>
      mealEntries.some((m) => m.recipe_id === r.id)
    );
    const invList = inventory.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
    }));
    return computeShoppingList(mealEntries, invList, recipeList);
  })();

  const todayStr = formatDate(new Date());

  useLayoutEffect(() => {
    if (!activePopover || !triggerRef.current) {
      setPopoverPosition(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 336; // w-80 = 20rem = 320px, plus padding
    const popoverHeight = Math.min(520, window.innerHeight - 32); // match max-h
    const padding = 8;
    const viewportPadding = 16;

    let top: number;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;

    if (spaceBelow >= popoverHeight) {
      // Open below trigger
      top = rect.bottom + padding;
    } else if (spaceAbove >= popoverHeight) {
      // Open above trigger
      top = rect.top - popoverHeight - padding;
    } else {
      // Not enough space either way: fit within viewport
      top = Math.max(viewportPadding, Math.min(rect.bottom + padding, window.innerHeight - popoverHeight - viewportPadding));
    }

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - popoverWidth - viewportPadding;
    }
    if (left < viewportPadding) left = viewportPadding;

    setPopoverPosition({ top, left });
  }, [activePopover]);

  useEffect(() => {
    if (!activePopover) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (popoverRef.current?.contains(target)) return;
      if (target.closest('[data-meal-slot]')) return;
      setActivePopover(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [activePopover]);

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-sage-900 mb-2">Meal Plan</h1>
        <p className="text-sage-600 mb-6">
          Assign recipes to breakfast, lunch, and dinner for each day. Save your plan to generate a shopping list.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-coral-50 border border-coral-200 text-coral-800 rounded-lg">
            {error}
          </div>
        )}

        {/* Save prompt modal */}
        {showSavePrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-sage-900/50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <h2 className="text-lg font-semibold text-sage-900 mb-2">
                You have unsaved changes
              </h2>
              <p className="text-sage-600 mb-6">
                Create shopping list before leaving?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleCreateShoppingList}
                  className="btn-primary w-full px-4 py-2"
                >
                  Create shopping list
                </button>
                <button
                  type="button"
                  onClick={handleSaveWithoutList}
                  className="w-full px-4 py-2 border border-sage-300 text-sage-700 rounded-lg hover:bg-sage-50 font-medium"
                >
                  Save without shopping list
                </button>
                <button
                  type="button"
                  onClick={handleCancelPrompt}
                  className="w-full px-4 py-2 text-sage-600 hover:text-sage-800 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <ShoppingListModal
          items={shoppingItems}
          onSave={handleShoppingListSave}
          onSkip={handleShoppingListSkip}
          isOpen={showShoppingModal}
        />

        {/* Month navigation + Save */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="px-4 py-2 border border-sage-300 text-sage-700 rounded-lg hover:bg-sage-50 font-medium"
            >
              ← Previous
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToThisMonth}
                className="px-4 py-2 text-terracotta-600 hover:text-terracotta-700 font-medium"
              >
                This month
              </button>
              <span className="text-sage-700 font-medium min-w-[140px]">
                {formatMonthYear(viewDate)}
              </span>
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="px-4 py-2 border border-sage-300 text-sage-700 rounded-lg hover:bg-sage-50 font-medium"
            >
              Next →
            </button>
          </div>
          {(dirty || entries.some((e) => e.recipe_id != null)) && (
            <button
              type="button"
              onClick={dirty ? handleSaveClick : openShoppingListModal}
              className="btn-primary px-4 py-2"
            >
              {dirty ? 'Save meal plan' : 'Create shopping list'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-sage-500 py-12">Loading...</div>
        ) : recipes.length === 0 ? (
          <div className="p-6 border border-dashed border-sage-300 rounded-lg text-center">
            <p className="text-sage-600 mb-2">No saved recipes yet.</p>
            <a
              href="/recipes"
              className="text-terracotta-600 hover:text-terracotta-700 font-medium"
            >
              Add recipes first →
            </a>
          </div>
        ) : (
          <div className="bg-white border border-sage-200 rounded-lg overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-sage-200 bg-sage-50">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="px-2 py-2 text-center text-xs font-medium text-sage-600"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarCells.map((cell, idx) => {
                if (!cell.date) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[100px] border-b border-r border-sage-100 last:border-r-0 bg-sage-50/50"
                    />
                  );
                }

                const dateStr = formatDate(cell.date);
                const isToday = dateStr === todayStr;

                return (
                  <div
                    key={dateStr}
                    className={`min-h-[100px] border-b border-r border-sage-100 last:border-r-0 p-2 flex flex-col ${
                      isToday ? 'bg-terracotta-50/50' : ''
                    }`}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isToday ? 'text-terracotta-700' : 'text-sage-700'
                      }`}
                    >
                      {cell.date!.getDate()}
                    </div>

                    <div className="flex-1 flex flex-col gap-0.5">
                      {MEAL_TYPES.map((mealType) => {
                        const entry = getEntry(dateStr, mealType);
                        const recipeId = entry?.recipe_id ?? null;
                        const recipe = recipeId ? recipes.find((r) => r.id === recipeId) : null;
                        const recipeRemoved = recipeId != null && !recipe;
                        const isActive =
                          activePopover?.dateStr === dateStr && activePopover?.mealType === mealType;

                        return (
                          <div key={mealType} className="relative">
                            <button
                              ref={isActive ? triggerRef : undefined}
                              type="button"
                              data-meal-slot
                              onClick={() =>
                                setActivePopover(isActive ? null : { dateStr, mealType })
                              }
                              className={`w-full flex items-center gap-1 text-left rounded px-1 py-0.5 hover:bg-sage-100 transition ${
                                recipe || recipeRemoved
                                  ? 'text-terracotta-600'
                                  : 'text-sage-400 hover:text-sage-600'
                              }`}
                              title={
                                recipe
                                  ? `${mealType}: ${recipe.name}`
                                  : recipeRemoved
                                    ? `${mealType}: Recipe removed`
                                    : `Add ${mealType}`
                              }
                            >
                              <span
                                className={`flex-shrink-0 w-2 h-2 rounded-full ${
                                  recipe || recipeRemoved
                                    ? 'bg-terracotta-500'
                                    : 'border border-sage-300 bg-white'
                                }`}
                              />
                              <span className="text-xs truncate flex-1 min-w-0">
                                {recipe
                                  ? truncate(recipe.name, 12)
                                  : recipeRemoved
                                    ? 'Removed'
                                    : MEAL_LABELS[mealType]}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recipe selection popover - rendered in portal to avoid calendar overflow clipping */}
        {activePopover && popoverPosition && typeof document !== 'undefined' && createPortal(
          <div
            ref={popoverRef}
            className="fixed z-50 w-80 min-h-[420px] max-h-[min(520px,calc(100vh-2rem))] flex flex-col p-3 bg-white border border-sage-200 rounded-lg shadow-lg"
            style={{ top: popoverPosition.top, left: popoverPosition.left }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-medium text-sage-600 mb-2 flex-shrink-0">
              {activePopover.mealType.charAt(0).toUpperCase() + activePopover.mealType.slice(1)} –{' '}
              {formatDisplayDate(activePopover.dateStr)}
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <RecipeCombobox
                recipes={recipes}
                value={getEntry(activePopover.dateStr, activePopover.mealType)?.recipe_id ?? null}
                onChange={(id) => updateEntryLocal(activePopover.dateStr, activePopover.mealType, id)}
                placeholder="Search recipes..."
                stackedLayout
                autoFocus
                recipeRemoved={(() => {
                  const entry = getEntry(activePopover.dateStr, activePopover.mealType);
                  const rid = entry?.recipe_id;
                  return rid != null && !recipes.find((r) => r.id === rid);
                })()}
                removedRecipeId={getEntry(activePopover.dateStr, activePopover.mealType)?.recipe_id ?? undefined}
              />
            </div>
          </div>,
          document.body
        )}
      </div>
    </ProtectedRoute>
  );
}
