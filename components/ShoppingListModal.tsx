'use client';

import { useState, useEffect } from 'react';

export interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  from_recipe_id?: number;
}

interface ShoppingListModalProps {
  items: ShoppingListItem[];
  scale: number;
  onScaleChange: (scale: number) => void;
  onSave: (items: ShoppingListItem[]) => void;
  onSkip: () => void;
  isOpen: boolean;
  naturalizing?: boolean;
}

function parseScaleInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (Number.isNaN(n)) return null;
  const frac = trimmed.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
  return n;
}

export default function ShoppingListModal({
  items,
  scale,
  onScaleChange,
  onSave,
  onSkip,
  isOpen,
  naturalizing = false,
}: ShoppingListModalProps) {
  const [editedItems, setEditedItems] = useState<ShoppingListItem[]>(items);
  const [scaleInput, setScaleInput] = useState(String(scale));

  useEffect(() => {
    if (isOpen) setEditedItems(items);
  }, [isOpen, items]);

  useEffect(() => {
    if (isOpen) setScaleInput(String(scale));
  }, [isOpen, scale]);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const formatItem = (item: ShoppingListItem) => {
    const parts = [item.quantity, item.unit, item.name].filter(Boolean);
    return parts.join(' ');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editedItems);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sage-900/50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-sage-200">
          <h2 className="text-xl font-semibold text-sage-900">Shopping list</h2>
          <p className="text-sm text-sage-600 mt-1">
            Items to buy based on your meal plan and current inventory.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-sage-500">Scale:</span>
            <input
              type="text"
              inputMode="decimal"
              value={scaleInput}
              onChange={(e) => {
                const value = e.target.value;
                setScaleInput(value);
                const parsed = parseScaleInput(value);
                if (parsed !== null && parsed >= 0.1 && parsed <= 20 && parsed !== scale) {
                  onScaleChange(parsed);
                }
              }}
              onBlur={() => setScaleInput(String(scale))}
              placeholder="1"
              title="Scale quantities by this factor (e.g. 2 for double, 0.5 for half)"
              className="w-14 px-2 py-0.5 text-sm border border-sage-300 rounded focus:outline-none focus:ring-1 focus:ring-terracotta-500 focus:border-terracotta-500"
            />
            <span className="text-xs text-sage-500">×</span>
            <span className="text-xs text-sage-400" title="Scale quantities by this factor (e.g. 2 for double, 0.5 for half)">
              (multiplier)
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {naturalizing ? (
            <p className="text-sage-500">Formatting...</p>
          ) : editedItems.length === 0 ? (
            <p className="text-sage-500">No items to buy. You have everything in inventory.</p>
          ) : (
            <ul className="space-y-2">
              {editedItems.map((item, idx) => (
                <li
                  key={`${item.name}-${idx}`}
                  className="flex items-center justify-between py-2 border-b border-sage-100 last:border-0"
                >
                  <span className="text-sage-800">{formatItem(item)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditedItems((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-sm text-coral-600 hover:text-coral-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-6 border-t border-sage-200 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 border border-sage-300 text-sage-700 rounded-lg hover:bg-sage-50 font-medium"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-4 py-2 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save shopping list'}
          </button>
        </div>
      </div>
    </div>
  );
}
