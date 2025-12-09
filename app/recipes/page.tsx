'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import RecipeCard from '@/components/RecipeCard';
import Link from 'next/link';

interface Tag {
  id: number;
  name: string;
}

interface Recipe {
  id: number;
  name: string;
  description: string;
  prep_time: number;
  cook_time: number;
  tags?: Tag[];
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTags();
    fetchRecipes();
  }, [selectedTags]);

  const fetchTags = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tags', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','));
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/recipes?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecipes(data);
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecipes();
  };

  const categorizeTags = () => {
    const tagCategories = {
      'Protein Types': ['chicken', 'beef', 'fish', 'vegetarian', 'vegan', 'pork'],
      'Difficulty Levels': ['easy', 'medium', 'hard'],
      'Cooking Methods': ['slow cooker', 'grill', 'stovetop', 'oven', 'instant pot'],
      'Cuisine Types': ['italian', 'american', 'mediterranean', 'mexican', 'asian', 'french'],
    };

    const categorized: Record<string, Tag[]> = {
      'Protein Types': [],
      'Difficulty Levels': [],
      'Cooking Methods': [],
      'Cuisine Types': [],
      'Custom Tags': [],
    };

    tags.forEach((tag) => {
      let found = false;
      for (const [category, names] of Object.entries(tagCategories)) {
        if (names.includes(tag.name.toLowerCase())) {
          categorized[category].push(tag);
          found = true;
          break;
        }
      }
      if (!found) {
        categorized['Custom Tags'].push(tag);
      }
    });

    return categorized;
  };

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
            <p className="mt-2 text-gray-600">Manage your recipe collection</p>
          </div>
          <Link
            href="/recipes/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + New Recipe
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Search
              </button>
            </div>
          </form>

          {/* Tag Filters */}
          {tags.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Filter by Tags:</h3>
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {Object.entries(categorizeTags()).map(([category, categoryTags]) => {
                  if (categoryTags.length === 0) return null;
                  return (
                    <div key={category} className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[100px]">
                        {category}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {categoryTags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => handleTagToggle(tag.id)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition ${
                              selectedTags.includes(tag.id)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recipes Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading recipes...</div>
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-4">No recipes found.</p>
            <Link
              href="/recipes/new"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first recipe →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
