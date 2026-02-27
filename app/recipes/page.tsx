'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import RecipeCard from '@/components/RecipeCard';
import Link from 'next/link';
import { authFetch } from '@/lib/auth-fetch';

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

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);

      const res = await authFetch(`/api/recipes?${params.toString()}`);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecipes();
  };

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-sage-900">Recipes</h1>
          <Link
            href="/dashboard"
            className="text-sm text-terracotta-600 hover:text-terracotta-700 font-medium"
          >
            Add recipe from URL
          </Link>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-terracotta-600 text-white rounded-lg hover:bg-terracotta-700 font-medium transition"
            >
              Search
            </button>
          </div>
        </form>

        {loading ? (
          <div className="text-center py-12 text-sage-500">Loading...</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-sage-300 rounded-lg">
            <p className="text-sage-600 mb-2">No recipes found.</p>
            <Link
              href="/dashboard"
              className="text-terracotta-600 hover:text-terracotta-700 font-medium"
            >
              Add a recipe from URL →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
