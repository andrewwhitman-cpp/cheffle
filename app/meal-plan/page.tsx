'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Calendar from '@/components/Calendar';

interface Recipe {
  id: number;
  name: string;
  description?: string;
  tags?: Array<{ id: number; name: string }>;
}

interface MealPlan {
  id: number;
  date: string;
  meal_type: string;
  recipe: Recipe;
}

interface Tag {
  id: number;
  name: string;
}

export default function MealPlanPage() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    recipe_id: '',
    meal_type: 'dinner',
    date: '',
  });

  useEffect(() => {
    fetchMealPlans();
    fetchRecipes();
    fetchTags();
  }, []);

  useEffect(() => {
    filterRecipes();
  }, [recipeSearchQuery, selectedTagIds, allRecipes]);

  const fetchMealPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);

      const response = await fetch(
        `/api/meal-plans?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setMealPlans(data);
      }
    } catch (error) {
      console.error('Failed to fetch meal plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/recipes', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAllRecipes(data);
        setRecipes(data);
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
    }
  };

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

  const filterRecipes = () => {
    let filtered = [...allRecipes];

    // Filter by search query
    if (recipeSearchQuery) {
      filtered = filtered.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(recipeSearchQuery.toLowerCase()) ||
          recipe.description?.toLowerCase().includes(recipeSearchQuery.toLowerCase())
      );
    }

    // Filter by selected tags
    if (selectedTagIds.length > 0) {
      filtered = filtered.filter((recipe) =>
        recipe.tags?.some((tag) => selectedTagIds.includes(tag.id))
      );
    }

    setRecipes(filtered);
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
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


  const handleDateClick = (date: Date, mealType: string) => {
    setSelectedDate(date);
    setFormData({
      ...formData,
      date: date.toISOString().split('T')[0],
      meal_type: mealType,
    });
    setSelectedMealPlan(null);
    setRecipeSearchQuery('');
    setSelectedTagIds([]);
    setShowModal(true);
  };

  const handleMealClick = (mealPlan: MealPlan) => {
    setSelectedMealPlan(mealPlan);
    setFormData({
      recipe_id: mealPlan.recipe.id.toString(),
      meal_type: mealPlan.meal_type,
      date: mealPlan.date,
    });
    setRecipeSearchQuery('');
    setSelectedTagIds([]);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const url = selectedMealPlan
        ? `/api/meal-plans/${selectedMealPlan.id}`
        : '/api/meal-plans';
      const method = selectedMealPlan ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchMealPlans();
        setShowModal(false);
        setSelectedDate(null);
        setSelectedMealPlan(null);
        setRecipeSearchQuery('');
        setSelectedTagIds([]);
      } else {
        let errorMessage = 'Failed to save meal plan';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Failed to save meal plan:', error);
      alert('Failed to save meal plan');
    }
  };

  const handleDelete = async () => {
    if (!selectedMealPlan) return;

    if (!confirm('Are you sure you want to delete this meal plan?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/meal-plans/${selectedMealPlan.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchMealPlans();
        setShowModal(false);
        setSelectedMealPlan(null);
      } else {
        let errorMessage = 'Failed to delete meal plan';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Failed to delete meal plan:', error);
      alert('Failed to delete meal plan');
    }
  };

  return (
    <ProtectedRoute>
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-sage-900 tracking-tight">Meal Plan</h1>
          <p className="text-sm text-sage-600 mt-1">
            Click a meal slot to add or edit a meal
          </p>
        </div>
        {loading ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-sage-200">
            <div className="text-sage-500">Loading calendar...</div>
          </div>
        ) : (
          <Calendar
            mealPlans={mealPlans}
            onDateClick={handleDateClick}
            onMealClick={handleMealClick}
          />
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg border border-sage-200 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-sage-900 mb-4 tracking-tight">
                {selectedMealPlan ? 'Edit Meal Plan' : 'Add Meal to Plan'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 text-sage-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      Meal Type
                    </label>
                    <select
                      value={formData.meal_type}
                      onChange={(e) => setFormData({ ...formData, meal_type: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 text-sage-900"
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-2">
                    Recipe
                  </label>
                  
                  {/* Search Bar */}
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Search recipes..."
                      value={recipeSearchQuery}
                      onChange={(e) => setRecipeSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 text-sage-900 placeholder:text-sage-400"
                    />
                  </div>

                  {/* Tag Filters */}
                  {tags.length > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-sage-700 uppercase tracking-wide">Filter by Tags:</span>
                        {selectedTagIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedTagIds([])}
                            className="text-xs text-terracotta-600 hover:text-terracotta-700 font-medium transition-colors"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto border border-sage-200 rounded-lg p-2">
                        {Object.entries(categorizeTags()).map(([category, categoryTags]) => {
                          if (categoryTags.length === 0) return null;
                          return (
                            <div key={category} className="flex items-center gap-2">
                              <span className="text-xs font-medium text-sage-500 min-w-[100px]">
                                {category}:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {categoryTags.map((tag) => (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => handleTagToggle(tag.id)}
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition ${
                                      selectedTagIds.includes(tag.id)
                                        ? 'bg-terracotta-600 text-white'
                                        : 'bg-cream-100 text-sage-700 hover:bg-cream-200'
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

                  {/* Recipe List */}
                  <div className="border border-sage-300 rounded-lg max-h-64 overflow-y-auto">
                    {recipes.length === 0 ? (
                      <div className="p-4 text-center text-sage-500 text-sm">
                        {allRecipes.length === 0 ? 'No recipes yet' : 'No recipes match your search'}
                      </div>
                    ) : (
                      <div className="divide-y divide-sage-200">
                        {recipes.map((recipe) => (
                          <button
                            key={recipe.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, recipe_id: recipe.id.toString() })}
                            className={`w-full text-left p-3 hover:bg-cream-50 transition ${
                              formData.recipe_id === recipe.id.toString() ? 'bg-terracotta-50 border-l-4 border-terracotta-500' : ''
                            }`}
                          >
                            <div className="font-medium text-sage-900">{recipe.name}</div>
                            {recipe.description && (
                              <div className="text-sm text-sage-600 mt-1 line-clamp-1">
                                {recipe.description}
                              </div>
                            )}
                            {recipe.tags && recipe.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {recipe.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag.id}
                                    className="px-2 py-0.5 text-xs rounded-full bg-cream-100 text-sage-700"
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                                {recipe.tags.length > 3 && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-cream-100 text-sage-700">
                                    +{recipe.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.recipe_id && (
                    <p className="mt-2 text-sm text-sage-600">
                      Selected: {recipes.find((r) => r.id.toString() === formData.recipe_id)?.name}
                    </p>
                  )}
                </div>

                <div className="flex gap-4 pt-4 border-t border-sage-200">
                  <button
                    type="submit"
                    disabled={!formData.recipe_id}
                    className="flex-1 bg-terracotta-600 text-white px-4 py-2 rounded-lg hover:bg-terracotta-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {selectedMealPlan ? 'Update' : 'Add'}
                  </button>
                  {selectedMealPlan && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="bg-coral-600 text-white px-4 py-2 rounded-lg hover:bg-coral-700 transition-colors font-medium"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedMealPlan(null);
                      setRecipeSearchQuery('');
                      setSelectedTagIds([]);
                    }}
                    className="bg-sage-200 text-sage-700 px-4 py-2 rounded-lg hover:bg-sage-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
