'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authFetch } from '@/lib/auth-fetch';
import UnitCombobox from '@/components/UnitCombobox';

interface InventoryItem {
  id: number;
  user_id: number;
  name: string;
  quantity: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await authFetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Failed to load inventory');
      }
    } catch (err) {
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const parseQuantity = (val: string): number => {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    const n = parseFloat(trimmed);
    if (!Number.isNaN(n)) return n;
    const frac = trimmed.match(/^(\d+)\/(\d+)$/);
    if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
    return 0;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const name = newName.trim();
    if (!name) return;

    setAdding(true);
    try {
      const res = await authFetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          quantity: parseQuantity(newQuantity) || 0,
          unit: newUnit.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to add');
      }
      const created = await res.json();
      setItems((prev) => {
        const existingIdx = prev.findIndex((i) => i.id === created.id);
        const next = existingIdx >= 0
          ? prev.map((i, idx) => (idx === existingIdx ? created : i))
          : [...prev, created];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      setNewName('');
      setNewQuantity('');
      setNewUnit('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add ingredient');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditQuantity(String(item.quantity));
    setEditUnit(item.unit);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditQuantity('');
    setEditUnit('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId == null) return;
    setError('');

    try {
      const res = await authFetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          name: editName.trim(),
          quantity: parseQuantity(editQuantity),
          unit: editUnit.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update');
      }
      const updated = await res.json();
      setItems((prev) =>
        prev.map((i) => (i.id === editingId ? updated : i)).sort((a, b) => a.name.localeCompare(b.name))
      );
      cancelEdit();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this ingredient from your inventory?')) return;
    setError('');

    try {
      const res = await authFetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete');
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const formatDisplay = (item: InventoryItem) => {
    const parts = [item.quantity, item.unit, item.name].filter(Boolean);
    return parts.join(' ');
  };

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-sage-900 mb-6">Inventory</h1>
        <p className="text-sage-600 mb-6">
          Track ingredients you have on hand. When you cook a recipe, Cheffle will help you deduct what you used.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-coral-50 border border-coral-200 text-coral-800 rounded-lg">
            {error}
          </div>
        )}

        {/* Add form */}
        <form onSubmit={handleAdd} className="mb-8 p-6 bg-white border border-sage-200 rounded-lg">
          <h2 className="text-lg font-medium text-sage-900 mb-4">Add ingredient</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Name (e.g. flour)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
              disabled={adding}
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="Qty"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="w-24 px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
              disabled={adding}
            />
            <UnitCombobox
              value={newUnit}
              onChange={setNewUnit}
              placeholder="Unit"
              disabled={adding}
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="px-6 py-2 bg-terracotta-600 text-white rounded-lg hover:bg-terracotta-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>

        {/* List */}
        <div>
          <h2 className="text-lg font-medium text-sage-900 mb-4">Your ingredients</h2>
          {loading ? (
            <div className="text-sage-500 py-8">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-sage-300 rounded-lg">
              <p className="text-sage-600 mb-2">No ingredients yet.</p>
              <p className="text-sm text-sage-500">Add ingredients above to start tracking your pantry.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-white border border-sage-200 rounded-lg"
                >
                  {editingId === item.id ? (
                    <form onSubmit={handleUpdate} className="flex flex-1 flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 min-w-[120px] px-3 py-1.5 border border-sage-300 rounded focus:outline-none focus:ring-1 focus:ring-terracotta-500"
                        required
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        className="w-20 px-3 py-1.5 border border-sage-300 rounded focus:outline-none focus:ring-1 focus:ring-terracotta-500"
                      />
                      <UnitCombobox
                        value={editUnit}
                        onChange={setEditUnit}
                        placeholder="Unit"
                        size="sm"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-terracotta-600 text-white rounded text-sm font-medium hover:bg-terracotta-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-3 py-1.5 border border-sage-300 text-sage-700 rounded text-sm hover:bg-sage-50"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="text-sage-800">{formatDisplay(item)}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="text-sm text-terracotta-600 hover:text-terracotta-700 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-sm text-coral-600 hover:text-coral-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
