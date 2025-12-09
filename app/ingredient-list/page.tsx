'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

export default function IngredientListPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    generateIngredientList();
  }, [dateRange]);

  const generateIngredientList = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/ingredient-lists?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setIngredients(data);
      } else {
        console.error('Failed to generate ingredient list');
      }
    } catch (error) {
      console.error('Failed to generate ingredient list:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: 0, unit: '' }]);
  };

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-semibold text-sage-900 mb-8 tracking-tight">Shopping List</h1>

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-sage-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-sage-900 mb-4">Select Date Range</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-sage-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                className="w-full px-4 py-2 bg-white border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 text-sage-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sage-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                className="w-full px-4 py-2 bg-white border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 text-sage-900"
              />
            </div>
          </div>
          <button
            onClick={generateIngredientList}
            className="mt-4 bg-terracotta-600 text-white px-4 py-2 rounded-lg hover:bg-terracotta-700 transition-colors font-medium"
          >
            Regenerate List
          </button>
        </div>

        {/* Ingredient List */}
        <div className="bg-white rounded-lg shadow-sm border border-sage-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-sage-900">Ingredients</h2>
            <button
              onClick={addIngredient}
              className="text-terracotta-600 hover:text-terracotta-700 text-sm font-medium transition-colors"
            >
              + Add Item
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-sage-500">Generating shopping list...</div>
            </div>
          ) : ingredients.length === 0 ? (
            <div className="text-center py-12 text-sage-500">
              <p>No ingredients found for the selected date range.</p>
              <p className="text-sm mt-2">Plan some meals to generate a shopping list!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2 items-center p-3 border border-sage-200 rounded-lg hover:border-terracotta-300 transition">
                  <input
                    type="text"
                    placeholder="Ingredient name"
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    className="flex-1 px-4 py-2 bg-white border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 text-sage-900 placeholder:text-sage-400"
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Quantity"
                    value={ingredient.quantity || ''}
                    onChange={(e) =>
                      updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)
                    }
                    className="w-24 px-4 py-2 bg-white border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 text-sage-900 placeholder:text-sage-400"
                  />
                  <input
                    type="text"
                    placeholder="Unit"
                    value={ingredient.unit}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                    className="w-24 px-4 py-2 bg-white border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 text-sage-900 placeholder:text-sage-400"
                  />
                  <button
                    onClick={() => removeIngredient(index)}
                    className="px-4 py-2 text-coral-600 hover:bg-coral-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {ingredients.length > 0 && (
            <div className="mt-6 pt-6 border-t border-sage-200">
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    await fetch('/api/ingredient-lists', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        ingredients,
                        startDate: dateRange.startDate,
                        endDate: dateRange.endDate,
                      }),
                    });
                    alert('Shopping list saved!');
                  } catch (error) {
                    console.error('Failed to save shopping list:', error);
                    alert('Failed to save shopping list');
                  }
                }}
                className="bg-sage-600 text-white px-6 py-2 rounded-lg hover:bg-sage-700 transition-colors font-medium"
              >
                Save Shopping List
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
