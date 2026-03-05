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
  onSave: (items: ShoppingListItem[]) => void;
  onSkip: () => void;
  isOpen: boolean;
}

export default function ShoppingListModal({
  items,
  onSave,
  onSkip,
  isOpen,
}: ShoppingListModalProps) {
  const [editedItems, setEditedItems] = useState<ShoppingListItem[]>(items);

  useEffect(() => {
    if (isOpen) setEditedItems(items);
  }, [isOpen, items]);
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
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {editedItems.length === 0 ? (
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
