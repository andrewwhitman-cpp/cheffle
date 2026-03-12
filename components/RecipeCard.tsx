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
  is_favorite?: boolean;
  dietary_tags?: string[];
}

interface RecipeCardProps {
  recipe: Recipe;
  onFavoriteToggle?: (id: number | string, currentFav: boolean) => void;
}

export default function RecipeCard({ recipe, onFavoriteToggle }: RecipeCardProps) {
  const totalTime = recipe.prep_time + recipe.cook_time;

  return (
    <div className="relative bg-white rounded-xl border border-sage-200 shadow-card transition-all duration-200 hover:border-terracotta-200 hover:shadow-card-hover">
      {onFavoriteToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoriteToggle(recipe.id, !!recipe.is_favorite);
          }}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full hover:bg-sage-100 transition-colors"
          aria-label={recipe.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className={`w-5 h-5 ${recipe.is_favorite ? 'fill-terracotta-500 text-terracotta-500' : 'fill-none text-sage-400 hover:text-terracotta-400'}`}
            stroke="currentColor"
            strokeWidth={recipe.is_favorite ? 0 : 1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </button>
      )}
      <Link
        href={`/recipes/${recipe.id}`}
        className="block focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:ring-offset-2 rounded-xl"
      >
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2 mb-2 pr-8">
            <h3 className="text-lg font-semibold text-sage-900">{recipe.name}</h3>
            {recipe.skill_level_adjusted && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-terracotta-100 text-terracotta-800">
                Adjusted for {getSkillLevelLabel(recipe.skill_level_adjusted)}
              </span>
            )}
          </div>
          {recipe.description && (
            <p className="text-sage-600 text-sm mb-3 line-clamp-2">{recipe.description}</p>
          )}
          {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {recipe.dietary_tags.map((tag) => (
                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sage-100 text-sage-700">
                  {tag}
                </span>
              ))}
            </div>
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
    </div>
  );
}
