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

      // Fetch recent recipes
      const recipesRes = await fetch('/api/recipes?limit=5', { headers });
      if (recipesRes.ok) {
        const recipes = await recipesRes.json();
        setRecentRecipes(recipes);
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
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back! Here's what's happening.</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Recipes */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Recent Recipes</h2>
                <Link
                  href="/recipes"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View all →
                </Link>
              </div>
              {recentRecipes.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  <p>No recipes yet.</p>
                  <Link
                    href="/recipes"
                    className="mt-2 inline-block text-blue-600 hover:text-blue-700"
                  >
                    Create your first recipe →
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {recentRecipes.map((recipe) => (
                    <li key={recipe.id}>
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="block p-3 rounded-lg hover:bg-gray-50 transition"
                      >
                        <div className="font-medium text-gray-900">{recipe.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {recipe.prep_time + recipe.cook_time} min
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Upcoming Meals */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Upcoming Meals</h2>
                <Link
                  href="/meal-plan"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View calendar →
                </Link>
              </div>
              {upcomingMeals.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  <p>No meals planned yet.</p>
                  <Link
                    href="/meal-plan"
                    className="mt-2 inline-block text-blue-600 hover:text-blue-700"
                  >
                    Plan your meals →
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {upcomingMeals.map((meal) => (
                    <li key={meal.id}>
                      <Link
                        href="/meal-plan"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900">
                              {meal.recipe.name}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {new Date(meal.date).toLocaleDateString()} • {meal.meal_type}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/recipes/new"
            className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition text-center"
          >
            <div className="text-2xl font-bold">+</div>
            <div className="mt-2">New Recipe</div>
          </Link>
          <Link
            href="/meal-plan"
            className="bg-green-600 text-white rounded-lg p-6 hover:bg-green-700 transition text-center"
          >
            <div className="text-2xl font-bold">📅</div>
            <div className="mt-2">Plan Meals</div>
          </Link>
          <Link
            href="/ingredient-list"
            className="bg-purple-600 text-white rounded-lg p-6 hover:bg-purple-700 transition text-center"
          >
            <div className="text-2xl font-bold">🛒</div>
            <div className="mt-2">Shopping List</div>
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  );
}
