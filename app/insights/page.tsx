'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

interface Recipe {
  id: number;
  name: string;
  prep_time: number;
  cook_time: number;
  tags?: Array<{ id: number; name: string }>;
}

interface MealPlan {
  id: number;
  date: string;
  meal_type: string;
  recipe: {
    id: number;
    name: string;
  };
}

interface TagUsage {
  tagId: number;
  tagName: string;
  count: number;
}

export default function InsightsPage() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
      };

      // Fetch all meal plans
      const mealPlansRes = await fetch('/api/meal-plans', { headers });
      if (mealPlansRes.ok) {
        const data = await mealPlansRes.json();
        setMealPlans(data);
      }

      // Fetch all recipes
      const recipesRes = await fetch('/api/recipes', { headers });
      if (recipesRes.ok) {
        const data = await recipesRes.json();
        setRecipes(data);
      }
    } catch (error) {
      console.error('Failed to fetch insights data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate most used recipes
  const getMostUsedRecipes = () => {
    const recipeCounts: Record<number, { name: string; count: number; id: number }> = {};
    
    mealPlans.forEach((meal) => {
      const recipeId = meal.recipe.id;
      if (recipeCounts[recipeId]) {
        recipeCounts[recipeId].count++;
      } else {
        recipeCounts[recipeId] = {
          id: recipeId,
          name: meal.recipe.name,
          count: 1,
        };
      }
    });

    return Object.values(recipeCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  // Calculate meal type distribution
  const getMealTypeDistribution = () => {
    const distribution = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0,
    };

    mealPlans.forEach((meal) => {
      if (meal.meal_type in distribution) {
        distribution[meal.meal_type as keyof typeof distribution]++;
      }
    });

    const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
    
    return {
      ...distribution,
      total,
      percentages: {
        breakfast: total > 0 ? Math.round((distribution.breakfast / total) * 100) : 0,
        lunch: total > 0 ? Math.round((distribution.lunch / total) * 100) : 0,
        dinner: total > 0 ? Math.round((distribution.dinner / total) * 100) : 0,
        snack: total > 0 ? Math.round((distribution.snack / total) * 100) : 0,
      },
    };
  };

  // Calculate most used tags
  const getMostUsedTags = (): TagUsage[] => {
    const tagCounts: Record<number, { name: string; count: number }> = {};

    mealPlans.forEach((meal) => {
      const recipe = recipes.find((r) => r.id === meal.recipe.id);
      if (recipe?.tags) {
        recipe.tags.forEach((tag) => {
          if (tagCounts[tag.id]) {
            tagCounts[tag.id].count++;
          } else {
            tagCounts[tag.id] = {
              name: tag.name,
              count: 1,
            };
          }
        });
      }
    });

    return Object.entries(tagCounts)
      .map(([tagId, data]) => ({
        tagId: parseInt(tagId),
        tagName: data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  // Calculate average meals per week
  const getAverageMealsPerWeek = () => {
    if (mealPlans.length === 0) return 0;

    const dates = mealPlans.map((meal) => new Date(meal.date));
    const earliestDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const latestDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    
    const daysDiff = Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.max(1, daysDiff / 7);
    
    return Math.round((mealPlans.length / weeks) * 10) / 10;
  };

  // Get recipes by time category
  const getRecipesByTime = () => {
    const quick = recipes.filter((r) => r.prep_time + r.cook_time <= 30).length;
    const medium = recipes.filter((r) => r.prep_time + r.cook_time > 30 && r.prep_time + r.cook_time <= 60).length;
    const long = recipes.filter((r) => r.prep_time + r.cook_time > 60).length;

    return { quick, medium, long, total: recipes.length };
  };

  // Get recent activity (meals in last 30 days)
  const getRecentActivity = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    return mealPlans.filter((meal) => meal.date >= dateStr).length;
  };

  const mostUsedRecipes = getMostUsedRecipes();
  const mealDistribution = getMealTypeDistribution();
  const mostUsedTags = getMostUsedTags();
  const avgMealsPerWeek = getAverageMealsPerWeek();
  const recipesByTime = getRecipesByTime();
  const recentActivity = getRecentActivity();

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-sage-500">Loading insights...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-sage-900 mb-2 tracking-tight">Insights</h1>
          <p className="text-base text-sage-600">Discover patterns and trends in your meal planning</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-sage-200 p-6">
            <div className="text-2xl font-semibold text-sage-900 mb-1">{mealPlans.length}</div>
            <div className="text-sm text-sage-600">Total Meals Planned</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-sage-200 p-6">
            <div className="text-2xl font-semibold text-sage-900 mb-1">{recipes.length}</div>
            <div className="text-sm text-sage-600">Total Recipes</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-sage-200 p-6">
            <div className="text-2xl font-semibold text-sage-900 mb-1">{avgMealsPerWeek}</div>
            <div className="text-sm text-sage-600">Avg Meals per Week</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-sage-200 p-6">
            <div className="text-2xl font-semibold text-sage-900 mb-1">{recentActivity}</div>
            <div className="text-sm text-sage-600">Meals (Last 30 Days)</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Most Used Recipes */}
          <div className="bg-white rounded-lg shadow-sm border border-sage-200 p-6">
            <h2 className="text-xl font-semibold text-sage-900 mb-4 tracking-tight">Most Used Recipes</h2>
            {mostUsedRecipes.length === 0 ? (
              <div className="text-center py-8 text-sage-500">
                <p>No meals planned yet.</p>
                <Link href="/meal-plan" className="text-terracotta-600 hover:text-terracotta-700 mt-2 inline-block">
                  Start planning →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {mostUsedRecipes.map((recipe, index) => (
                  <div key={recipe.id} className="flex items-center justify-between p-3 border border-sage-200 rounded-lg hover:border-terracotta-300 transition">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        index === 0 ? 'bg-terracotta-100 text-terracotta-700' :
                        index === 1 ? 'bg-sage-100 text-sage-700' :
                        index === 2 ? 'bg-cream-100 text-cream-700' :
                        'bg-cream-50 text-sage-600'
                      }`}>
                        {index + 1}
                      </div>
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="font-medium text-sage-900 hover:text-terracotta-600 transition-colors"
                      >
                        {recipe.name}
                      </Link>
                    </div>
                    <div className="text-sm text-sage-600 font-medium">{recipe.count}x</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meal Type Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-sage-200 p-6">
            <h2 className="text-xl font-semibold text-sage-900 mb-4 tracking-tight">Meal Type Distribution</h2>
            {mealDistribution.total === 0 ? (
              <div className="text-center py-8 text-sage-500">
                <p>No meals planned yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-sage-700">Breakfast</span>
                    <span className="text-sm text-sage-600">{mealDistribution.breakfast} ({mealDistribution.percentages.breakfast}%)</span>
                  </div>
                  <div className="w-full bg-cream-100 rounded-full h-3">
                    <div
                      className="bg-cream-500 h-3 rounded-full transition-all"
                      style={{ width: `${mealDistribution.percentages.breakfast}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-sage-700">Lunch</span>
                    <span className="text-sm text-sage-600">{mealDistribution.lunch} ({mealDistribution.percentages.lunch}%)</span>
                  </div>
                  <div className="w-full bg-cream-100 rounded-full h-3">
                    <div
                      className="bg-sage-500 h-3 rounded-full transition-all"
                      style={{ width: `${mealDistribution.percentages.lunch}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-sage-700">Dinner</span>
                    <span className="text-sm text-sage-600">{mealDistribution.dinner} ({mealDistribution.percentages.dinner}%)</span>
                  </div>
                  <div className="w-full bg-cream-100 rounded-full h-3">
                    <div
                      className="bg-terracotta-500 h-3 rounded-full transition-all"
                      style={{ width: `${mealDistribution.percentages.dinner}%` }}
                    />
                  </div>
                </div>
                {mealDistribution.snack > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-sage-700">Snack</span>
                      <span className="text-sm text-sage-600">{mealDistribution.snack} ({mealDistribution.percentages.snack}%)</span>
                    </div>
                    <div className="w-full bg-cream-100 rounded-full h-3">
                      <div
                        className="bg-coral-500 h-3 rounded-full transition-all"
                        style={{ width: `${mealDistribution.percentages.snack}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Most Used Tags */}
          <div className="bg-white rounded-lg shadow-sm border border-sage-200 p-6">
            <h2 className="text-xl font-semibold text-sage-900 mb-4 tracking-tight">Most Used Tags</h2>
            {mostUsedTags.length === 0 ? (
              <div className="text-center py-8 text-sage-500">
                <p>No tags used in meal plans yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mostUsedTags.map((tag, index) => (
                  <div key={tag.tagId} className="flex items-center justify-between p-3 border border-sage-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-terracotta-500"></div>
                      <span className="font-medium text-sage-900">{tag.tagName}</span>
                    </div>
                    <div className="text-sm text-sage-600 font-medium">{tag.count}x</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recipes by Time */}
          <div className="bg-white rounded-lg shadow-sm border border-sage-200 p-6">
            <h2 className="text-xl font-semibold text-sage-900 mb-4 tracking-tight">Recipes by Cooking Time</h2>
            {recipesByTime.total === 0 ? (
              <div className="text-center py-8 text-sage-500">
                <p>No recipes yet.</p>
                <Link href="/recipes/new" className="text-terracotta-600 hover:text-terracotta-700 mt-2 inline-block">
                  Create your first recipe →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-sage-700">Quick (≤30 min)</span>
                    <span className="text-sm text-sage-600">{recipesByTime.quick}</span>
                  </div>
                  <div className="w-full bg-cream-100 rounded-full h-3">
                    <div
                      className="bg-sage-500 h-3 rounded-full transition-all"
                      style={{ width: `${recipesByTime.total > 0 ? (recipesByTime.quick / recipesByTime.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-sage-700">Medium (31-60 min)</span>
                    <span className="text-sm text-sage-600">{recipesByTime.medium}</span>
                  </div>
                  <div className="w-full bg-cream-100 rounded-full h-3">
                    <div
                      className="bg-terracotta-500 h-3 rounded-full transition-all"
                      style={{ width: `${recipesByTime.total > 0 ? (recipesByTime.medium / recipesByTime.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-sage-700">Long (>60 min)</span>
                    <span className="text-sm text-sage-600">{recipesByTime.long}</span>
                  </div>
                  <div className="w-full bg-cream-100 rounded-full h-3">
                    <div
                      className="bg-cream-500 h-3 rounded-full transition-all"
                      style={{ width: `${recipesByTime.total > 0 ? (recipesByTime.long / recipesByTime.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
