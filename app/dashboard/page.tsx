'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { getSkillLevelLabel } from '@/lib/skill-levels';

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

export default function DashboardPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [preview, setPreview] = useState<ParsedRecipe | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/recipes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      }
    } catch (err) {
      console.error('Failed to fetch recipes', err);
    } finally {
      setLoading(false);
    }
  };

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    setParseError('');
    setPreview(null);
    if (!url.trim()) return;

    setParsing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/recipes/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to parse recipe');
      }
      setPreview(data);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse recipe');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
    } catch (err: any) {
      setParseError(err.message || 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setParseError('');
  };

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-sage-900 mb-6">Dashboard</h1>

        {/* Add recipe from URL */}
        <div className="mb-8">
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

        {/* Recipe list */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-sage-900">My recipes</h2>
            <Link
              href="/recipes"
              className="text-sm text-terracotta-600 hover:text-terracotta-700 font-medium"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="text-sage-500 py-8">Loading...</div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-sage-300 rounded-lg">
              <p className="text-sage-600 mb-2">No recipes yet.</p>
              <p className="text-sm text-sage-500">
                Paste a recipe URL above to add your first recipe.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recipes.slice(0, 8).map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.id}`}
                  className="block p-4 border border-sage-200 rounded-lg hover:border-terracotta-300 hover:shadow-sm transition"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sage-900">{recipe.name}</span>
                    {recipe.skill_level_adjusted && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-terracotta-100 text-terracotta-800">
                        Adjusted for {getSkillLevelLabel(recipe.skill_level_adjusted)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-sage-500 mt-0.5">
                    {recipe.prep_time + recipe.cook_time} min
                    {recipe.servings != null && recipe.servings > 0 && (
                      <span className="ml-2">· Serves {recipe.servings}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
