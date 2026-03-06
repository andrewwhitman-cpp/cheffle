'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authFetch } from '@/lib/auth-fetch';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { simplifyForDisplay } from '@/lib/unit-simplify';

interface ShoppingListItem {
  id: number;
  shopping_list_id: number;
  name: string;
  quantity: number;
  unit: string;
  from_recipe_id: number | null;
  purchased: number;
  created_at: string;
}

interface ShoppingList {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
  items: ShoppingListItem[];
}

export default function ShoppingListPage() {
  const router = useRouter();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);
  const [addingToInventory, setAddingToInventory] = useState(false);
  const [unitPreference, setUnitPreference] = useState<'imperial' | 'metric'>('metric');

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await authFetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        const pref = data?.unit_preference;
        if (pref === 'imperial' || pref === 'metric') setUnitPreference(pref);
      }
    };
    fetchProfile();
  }, []);

  const fetchList = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await authFetch('/api/shopping-lists?latest=true');
      if (res.ok) {
        const data = await res.json();
        setList(data);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Failed to load shopping list');
      }
    } catch (err) {
      setError('Failed to load shopping list');
    } finally {
      setLoading(false);
    }
  };

  const selectAll = async (purchased: 0 | 1) => {
    if (!list || list.items.length === 0) return;
    setUpdating(-1);
    setError('');
    try {
      const updatedItems = list.items.map((i) => ({
        ...i,
        purchased,
      }));
      const res = await authFetch(`/api/shopping-lists/${list.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: updatedItems.map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            purchased: i.purchased,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update');
      }
      const data = await res.json();
      setList(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setUpdating(null);
    }
  };

  const togglePurchased = async (item: ShoppingListItem) => {
    if (!list) return;
    setUpdating(item.id);
    setError('');
    try {
      const updatedItems = list.items.map((i) =>
        i.id === item.id
          ? { ...i, purchased: i.purchased ? 0 : 1 }
          : { id: i.id, name: i.name, quantity: i.quantity, unit: i.unit, purchased: i.purchased }
      );
      const res = await authFetch(`/api/shopping-lists/${list.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: updatedItems.map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            purchased: i.purchased,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update');
      }
      const data = await res.json();
      setList(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setUpdating(null);
    }
  };

  const formatItem = (item: ShoppingListItem) => {
    const { quantity, unit } = simplifyForDisplay(item.quantity, item.unit, unitPreference);
    const parts = [quantity, unit, item.name].filter(Boolean);
    return parts.join(' ');
  };

  const purchasedCount = list?.items.filter((i) => i.purchased).length ?? 0;

  const doAddToInventory = async () => {
    if (!list) return;
    setAddingToInventory(true);
    setError('');
    try {
      const res = await authFetch(`/api/shopping-lists/${list.id}/add-to-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchasedOnly: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to add to inventory');
      }
      const data = await res.json();
      setList(data.list);
      if (data.added?.length > 0) {
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add to inventory');
    } finally {
      setAddingToInventory(false);
    }
  };

  const handleAddToInventory = () => {
    if (!list) return;
    doAddToInventory();
  };

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-sage-900 mb-2">Shopping list</h1>
        <p className="text-sage-600 mb-6">
          Check off items as you buy them. Add purchased items to your inventory when you get home.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-coral-50 border border-coral-200 text-coral-800 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sage-500 py-12">Loading...</div>
        ) : !list ? (
          <div className="text-center py-12 border border-dashed border-sage-300 rounded-lg">
            <p className="text-sage-600 mb-2">No shopping list yet.</p>
            <p className="text-sm text-sage-500 mb-4">
              Plan your meals and create a shopping list from the meal plan page.
            </p>
            <Link
              href="/meal-plan"
              className="text-terracotta-600 hover:text-terracotta-700 font-medium"
            >
              Go to Meal plan →
            </Link>
          </div>
        ) : list.items.length === 0 ? (
          <div className="text-center py-12 border border-sage-200 rounded-lg">
            <p className="text-sage-600 mb-2">This list is empty.</p>
            <Link
              href="/meal-plan"
              className="text-terracotta-600 hover:text-terracotta-700 font-medium"
            >
              Plan meals to generate a new list →
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-sm text-sage-600">{list.name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectAll(1)}
                  disabled={updating !== null || purchasedCount === list.items.length}
                  className="text-sm text-terracotta-600 hover:text-terracotta-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Select all
                </button>
                <span className="text-sage-300">|</span>
                <button
                  type="button"
                  onClick={() => selectAll(0)}
                  disabled={updating !== null || purchasedCount === 0}
                  className="text-sm text-terracotta-600 hover:text-terracotta-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Deselect all
                </button>
              </div>
            </div>
            <ul className="space-y-2 mb-8">
              {list.items.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border ${
                    item.purchased ? 'bg-sage-50 border-sage-200' : 'bg-white border-sage-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => togglePurchased(item)}
                    disabled={updating !== null}
                    className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                      item.purchased
                        ? 'bg-terracotta-500 border-terracotta-500 text-white'
                        : 'border-sage-400 hover:border-terracotta-500'
                    }`}
                  >
                    {item.purchased && '✓'}
                  </button>
                  <span
                    className={`flex-1 ${
                      item.purchased ? 'text-sage-500 line-through' : 'text-sage-800'
                    }`}
                  >
                    {formatItem(item)}
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleAddToInventory}
              disabled={addingToInventory || purchasedCount === 0}
              className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingToInventory ? 'Adding...' : 'Add purchased to inventory'}
            </button>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
