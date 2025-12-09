'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

interface Recipe {
  id: number;
  name: string;
  description: string;
  prep_time: number;
  cook_time: number;
  tags?: Array<{ id: number; name: string }>;
}

interface MealPlan {
  id: number;
  date: string;
  meal_type: string;
  recipe: Recipe;
}

export default function DashboardPage() {
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);
  const [upcomingMeals, setUpcomingMeals] = useState<MealPlan[]>([]);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [todayMeals, setTodayMeals] = useState<MealPlan[]>([]);
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

      // Fetch all recipes for stats
      const allRecipesRes = await fetch('/api/recipes', { headers });
      if (allRecipesRes.ok) {
        const recipes = await allRecipesRes.json();
        setAllRecipes(recipes);
        setRecentRecipes(recipes.slice(0, 6));
      }

      // Fetch upcoming meals (next 7 days)
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const mealPlansRes = await fetch(
        `/api/meal-plans?startDate=${today.toISOString().split('T')[0]}&endDate=${nextWeek.toISOString().split('T')[0]}`,
        { headers }
      );
      if (mealPlansRes.ok) {
        const meals = await mealPlansRes.json();
        setUpcomingMeals(meals);
        
        // Get today's meals
        const todayStr = today.toISOString().split('T')[0];
        const todayMealsList = meals.filter((meal: MealPlan) => meal.date === todayStr);
        setTodayMeals(todayMealsList);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMealTypeLabel = (mealType: string) => {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return 'bg-cream-100 text-cream-800 border-cream-300';
      case 'lunch':
        return 'bg-sage-100 text-sage-800 border-sage-300';
      case 'dinner':
        return 'bg-terracotta-100 text-terracotta-800 border-terracotta-300';
      default:
        return 'bg-cream-50 text-sage-700 border-sage-200';
    }
  };

  const groupMealsByDate = (meals: MealPlan[]) => {
    const grouped: Record<string, MealPlan[]> = {};
    meals.forEach((meal) => {
      if (!grouped[meal.date]) {
        grouped[meal.date] = [];
      }
      grouped[meal.date].push(meal);
    });
    return grouped;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };

  const mealsThisWeek = upcomingMeals.length;
  const totalRecipes = allRecipes.length;
  const mealsToday = todayMeals.length;

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-sage-900 mb-2 tracking-tight">Dashboard</h1>
          <p className="text-base text-sage-600">Welcome back! Here's what's happening.</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-sage-500">Loading...</div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-lg shadow-sm border border-terracotta-400 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-terracotta-100 text-sm font-medium mb-1">Total Recipes</p>
                    <p className="text-4xl font-semibold">{totalRecipes}</p>
                  </div>
                </div>
                <Link
                  href="/recipes"
                  className="mt-4 inline-block text-sm text-terracotta-100 hover:text-white font-medium transition-colors"
                >
                  View all recipes →
                </Link>
              </div>

              <div className="bg-gradient-to-br from-sage-500 to-sage-600 rounded-lg shadow-sm border border-sage-400 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sage-100 text-sm font-medium mb-1">Meals This Week</p>
                    <p className="text-4xl font-semibold">{mealsThisWeek}</p>
                  </div>
                </div>
                <Link
                  href="/meal-plan"
                  className="mt-4 inline-block text-sm text-sage-100 hover:text-white font-medium transition-colors"
                >
                  View calendar →
                </Link>
              </div>

              <div className="bg-gradient-to-br from-cream-500 to-cream-600 rounded-lg shadow-sm border border-cream-400 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cream-100 text-sm font-medium mb-1">Today's Meals</p>
                    <p className="text-4xl font-semibold">{mealsToday}</p>
                  </div>
                </div>
                <Link
                  href="/meal-plan"
                  className="mt-4 inline-block text-sm text-cream-100 hover:text-white font-medium transition-colors"
                >
                  Plan meals →
                </Link>
              </div>
            </div>

            {/* Today's Meals Section */}
            {mealsToday > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-sage-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-sage-900 tracking-tight">
                    Today's Meals
                  </h2>
                  <Link
                    href="/meal-plan"
                    className="text-sm text-terracotta-600 hover:text-terracotta-700 font-medium transition-colors"
                  >
                    View calendar →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['breakfast', 'lunch', 'dinner'].map((mealType) => {
                    const meal = todayMeals.find((m) => m.meal_type === mealType);
                    return (
                      <div
                        key={mealType}
                        className={`rounded-lg border-2 p-4 ${getMealTypeColor(mealType)} ${
                          meal ? '' : 'opacity-50 border-dashed'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wide">{getMealTypeLabel(mealType)}</span>
                        </div>
                        {meal ? (
                          <Link
                            href={`/recipes/${meal.recipe.id}`}
                            className="block font-medium hover:underline"
                          >
                            {meal.recipe.name}
                          </Link>
                        ) : (
                          <Link
                            href="/meal-plan"
                            className="text-sm opacity-75 hover:opacity-100"
                          >
                            Not planned yet
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Recent Recipes */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-sage-200">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-sage-900 tracking-tight">
                    Recent Recipes
                  </h2>
                  <Link
                    href="/recipes"
                    className="text-sm text-terracotta-600 hover:text-terracotta-700 font-medium transition-colors"
                  >
                    View all →
                  </Link>
                </div>
                {recentRecipes.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sage-500 mb-4">No recipes yet.</p>
                    <Link
                      href="/recipes/new"
                      className="inline-block bg-terracotta-600 text-white px-6 py-3 rounded-lg hover:bg-terracotta-700 transition-colors font-medium"
                    >
                      Create your first recipe
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentRecipes.map((recipe) => (
                      <Link
                        key={recipe.id}
                        href={`/recipes/${recipe.id}`}
                        className="block p-4 rounded-lg border border-sage-200 hover:border-terracotta-300 hover:shadow-sm transition group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sage-900 group-hover:text-terracotta-600 transition mb-1">
                              {recipe.name}
                            </div>
                            {recipe.description && (
                              <div className="text-sm text-sage-600 line-clamp-1 mb-2">
                                {recipe.description}
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-xs text-sage-500">
                              <span>{recipe.prep_time + recipe.cook_time} min</span>
                              {recipe.tags && recipe.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {recipe.tags.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="px-2 py-0.5 rounded-full bg-cream-100 text-sage-700"
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Meals */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-sage-200">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-sage-900 tracking-tight">
                    Upcoming Meals
                  </h2>
                  <Link
                    href="/meal-plan"
                    className="text-sm text-terracotta-600 hover:text-terracotta-700 font-medium transition-colors"
                  >
                    View calendar →
                  </Link>
                </div>
                {upcomingMeals.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sage-500 mb-4">No meals planned yet.</p>
                    <Link
                      href="/meal-plan"
                      className="inline-block bg-sage-600 text-white px-6 py-3 rounded-lg hover:bg-sage-700 transition-colors font-medium"
                    >
                      Plan your meals
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {Object.entries(groupMealsByDate(upcomingMeals))
                      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                      .map(([date, meals]) => (
                        <div key={date} className="border-l-4 border-terracotta-400 pl-4">
                          <div className="font-semibold text-sage-900 mb-2">
                            {formatDate(date)}
                          </div>
                          <div className="space-y-2">
                            {meals.map((meal) => (
                              <Link
                                key={meal.id}
                                href="/meal-plan"
                                className="block p-3 rounded-lg border border-sage-200 hover:border-terracotta-300 hover:shadow-sm transition group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="font-medium text-sage-900 group-hover:text-terracotta-600 transition">
                                      {meal.recipe.name}
                                    </div>
                                    <div className="text-xs text-sage-500 capitalize mt-0.5">
                                      {meal.meal_type}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/recipes/new"
                className="group bg-gradient-to-br from-terracotta-500 to-terracotta-600 text-white rounded-lg shadow-sm border border-terracotta-400 p-8 hover:shadow-md transition"
              >
                <div className="text-xl font-semibold mb-2">New Recipe</div>
                <div className="text-terracotta-100 text-sm">Create a new recipe to add to your collection</div>
              </Link>
              <Link
                href="/meal-plan"
                className="group bg-gradient-to-br from-sage-500 to-sage-600 text-white rounded-lg shadow-sm border border-sage-400 p-8 hover:shadow-md transition"
              >
                <div className="text-xl font-semibold mb-2">Plan Meals</div>
                <div className="text-sage-100 text-sm">Schedule your meals for the week ahead</div>
              </Link>
              <Link
                href="/ingredient-list"
                className="group bg-gradient-to-br from-cream-500 to-cream-600 text-white rounded-lg shadow-sm border border-cream-400 p-8 hover:shadow-md transition"
              >
                <div className="text-xl font-semibold mb-2">Shopping List</div>
                <div className="text-cream-100 text-sm">Generate your grocery list from meal plans</div>
              </Link>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
