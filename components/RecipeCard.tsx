'use client';

import Link from 'next/link';

interface Recipe {
  id: number;
  name: string;
  description: string;
  prep_time: number;
  cook_time: number;
  source_url?: string;
}

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const totalTime = recipe.prep_time + recipe.cook_time;

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block bg-white rounded-lg border border-sage-200 hover:border-terracotta-300 hover:shadow-sm transition p-6"
    >
      <h3 className="text-lg font-semibold text-sage-900 mb-2">{recipe.name}</h3>
      {recipe.description && (
        <p className="text-sage-600 text-sm mb-4 line-clamp-2">{recipe.description}</p>
      )}
      <div className="text-sm text-sage-500">
        <span>{totalTime} min</span>
        {recipe.prep_time > 0 && (
          <span className="ml-2">Prep: {recipe.prep_time} min</span>
        )}
      </div>
    </Link>
  );
}
