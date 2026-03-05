'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import RecipeCard from '@/components/RecipeCard';
import RecipeCardSkeleton from '@/components/RecipeCardSkeleton';
import Link from 'next/link';
import { authFetch } from '@/lib/auth-fetch';

const SEARCH_DEBOUNCE_MS = 300;

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

function RecipesPageContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [loading, setLoading] = useState(true);

  // Sync search query when URL changes (e.g. from header search)
  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  const fetchRecipes = useCallback(async (query: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.append('search', query.trim());

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
  }, []);

  const isInitialMount = useRef(true);

  // Initial load (use search param from URL if present)
  useEffect(() => {
    fetchRecipes(initialSearch);
  }, [fetchRecipes, initialSearch]);

  // Debounced live search when user types (skip on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      fetchRecipes(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchRecipes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecipes(searchQuery);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="section-heading text-2xl">Recipes</h1>
          <Link href="/" className="text-sm link-accent">
            Add recipe from URL
          </Link>
        </div>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 transition-shadow"
            />
            <button type="submit" className="btn-primary px-6 py-2">
              Search
            </button>
          </div>
        </form>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-sage-300 bg-white shadow-sm">
            <p className="text-sage-600 mb-2">No recipes found.</p>
            <Link href="/" className="link-accent">
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
  );
}

export default function RecipesPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }>
        <RecipesPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
