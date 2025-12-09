'use client';

import Link from 'next/link';

interface Tag {
  id: number;
  name: string;
  color?: string;
}

interface Recipe {
  id: number;
  name: string;
  description: string;
  prep_time: number;
  cook_time: number;
  tags?: Tag[];
}

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const totalTime = recipe.prep_time + recipe.cook_time;

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition p-6"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{recipe.name}</h3>
      {recipe.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{recipe.description}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>⏱️ {totalTime} min</span>
          {recipe.prep_time > 0 && <span>Prep: {recipe.prep_time} min</span>}
        </div>
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
              >
                {tag.name}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="px-2 py-1 text-xs text-gray-500">
                +{recipe.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
