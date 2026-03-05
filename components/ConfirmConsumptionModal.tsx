'use client';

import { useState, useEffect } from 'react';
import { findBestInventoryMatch } from '@/lib/ingredient-matching';
import { authFetch } from '@/lib/auth-fetch';

interface RecipeIngredient {
  name: string;
  quantity: string;
  unit: string;
}

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
}

interface ConsumeItem {
  name: string;
  quantity: string;
  unit: string;
  inventoryId: number | null;
  action: 'use' | 'skip';
  matchedName: string;
}

interface ConfirmConsumptionModalProps {
  recipeId: number;
  recipeName: string;
  ingredients: RecipeIngredient[];
  onConfirm: () => void;
  onSkip: () => void;
}

export default function ConfirmConsumptionModal({
  recipeId,
  recipeName,
  ingredients,
  onConfirm,
  onSkip,
}: ConfirmConsumptionModalProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ConsumeItem[]>([]);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await authFetch('/api/inventory');
        if (res.ok) {
          const data = await res.json();
          setInventory(data);
        }
      } catch {
        setError('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  useEffect(() => {
    if (!inventory.length || !ingredients.length) return;

    const invItems = inventory.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
    }));

    const initial: ConsumeItem[] = ingredients.map((ing) => {
      const match = findBestInventoryMatch(
        { name: ing.name, quantity: ing.quantity, unit: ing.unit },
        invItems
      );
      return {
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        inventoryId: match?.inventoryItem.id ?? null,
        action: match ? 'use' : 'skip',
        matchedName: match?.inventoryItem.name ?? '',
      };
    });
    setItems(initial);
  }, [inventory, ingredients]);

  const updateItem = (index: number, updates: Partial<ConsumeItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleInventorySelect = (index: number, invId: number | null) => {
    const inv = inventory.find((i) => i.id === invId);
    updateItem(index, {
      inventoryId: invId,
      action: invId ? 'use' : 'skip',
      matchedName: inv?.name ?? '',
    });
  };

  const handleConfirm = async () => {
    setError('');
    const useWithoutMatch = items.filter((i) => i.action === 'use' && i.inventoryId == null);
    if (useWithoutMatch.length > 0) {
      setError('Please select an inventory item for each ingredient you used, or uncheck "Use".');
      return;
    }
    setSubmitting(true);
    try {
      const payload = items
        .filter((i) => i.action === 'use' && i.inventoryId != null)
        .map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          inventoryId: i.inventoryId,
          action: 'use' as const,
        }));

      const res = await authFetch('/api/inventory/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId, ingredients: payload }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update inventory');
      if (data.errors?.length) {
        setError(data.errors.join('. '));
        return;
      }
      onConfirm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update inventory');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <p className="text-sage-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-sage-200">
          <h2 className="text-xl font-semibold text-sage-900">Update inventory</h2>
          <p className="text-sm text-sage-600 mt-1">
            Confirm which ingredients you used from {recipeName}. Adjust quantities or skip items you didn&apos;t use.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-coral-50 border border-coral-200 text-coral-800 rounded-lg text-sm">
              {error}
            </div>
          )}
          {items.map((item, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border ${
                item.action === 'skip' ? 'border-sage-200 bg-sage-50' : 'border-sage-200 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-medium text-sage-800">
                  {item.quantity} {item.unit} {item.name}
                </span>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={item.action === 'use'}
                    onChange={(e) =>
                      updateItem(i, {
                        action: e.target.checked ? 'use' : 'skip',
                        inventoryId: e.target.checked ? (item.inventoryId || undefined) : null,
                      })
                    }
                  />
                  Use
                </label>
              </div>
              {item.action === 'use' && (
                <div className="mt-2">
                  <label className="block text-xs text-sage-500 mb-1">Deduct from</label>
                  <select
                    value={item.inventoryId ?? ''}
                    onChange={(e) =>
                      handleInventorySelect(i, e.target.value ? parseInt(e.target.value, 10) : null)
                    }
                    className="w-full px-3 py-2 border border-sage-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-terracotta-500"
                  >
                    <option value="">— Select inventory item —</option>
                    {inventory.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.quantity} {inv.unit})
                      </option>
                    ))}
                  </select>
                  {item.inventoryId && (
                    <input
                      type="text"
                      placeholder="Quantity used"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, { quantity: e.target.value })}
                      className="mt-1 w-24 px-2 py-1 border border-sage-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-terracotta-500"
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-sage-200 flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Updating...' : 'Confirm & update inventory'}
          </button>
          <button
            onClick={onSkip}
            disabled={submitting}
            className="px-6 py-2 border border-sage-300 text-sage-700 rounded-lg hover:bg-sage-50 disabled:opacity-50 font-medium"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
