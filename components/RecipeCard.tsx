'use client';

import Link from 'next/link';
import { getSkillLevelLabel } from '@/lib/skill-levels';

interface Recipe {
  id: number | string;
  name: string;
  description: string;
  prep_time: number;
  cook_time: number;
  servings?: number | null;
  source_url?: string;
  skill_level_adjusted?: string | null;
}

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const totalTime = recipe.prep_time + recipe.cook_time;

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block bg-white rounded-xl border border-sage-200 shadow-card transition-all duration-200 hover:border-terracotta-200 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:ring-offset-2"
    >
      <div className="p-6">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-lg font-semibold text-sage-900">{recipe.name}</h3>
        {recipe.skill_level_adjusted && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-terracotta-100 text-terracotta-800">
            Adjusted for {getSkillLevelLabel(recipe.skill_level_adjusted)}
          </span>
        )}
      </div>
      {recipe.description && (
        <p className="text-sage-600 text-sm mb-4 line-clamp-2">{recipe.description}</p>
      )}
      {(recipe.prep_time > 0 || recipe.cook_time > 0 || totalTime > 0 || (recipe.servings != null && recipe.servings > 0)) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-sage-500">
          {recipe.prep_time > 0 && <span>Prep: {recipe.prep_time} min</span>}
          {recipe.cook_time > 0 && <span>Cook: {recipe.cook_time} min</span>}
          {totalTime > 0 && <span>Total: {totalTime} min</span>}
          {recipe.servings != null && recipe.servings > 0 && (
            <span>Serves {recipe.servings}</span>
          )}
        </div>
      )}
      </div>
    </Link>
  );
}
