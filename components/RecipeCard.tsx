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
    <div className="group relative bg-white rounded-2xl border border-sage-200/60 transition-all duration-300 hover:border-sage-300 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
      {onFavoriteToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoriteToggle(recipe.id, !!recipe.is_favorite);
          }}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-sage-50 transition-colors"
          aria-label={recipe.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className={`w-5 h-5 transition-transform duration-300 active:scale-75 ${recipe.is_favorite ? 'fill-terracotta-500 text-terracotta-500' : 'fill-none text-sage-400 hover:text-terracotta-400'}`}
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
        className="block focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:ring-offset-2 rounded-2xl h-full"
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex flex-wrap items-start gap-2 mb-3 pr-8">
            <h3 className="text-2xl font-serif text-sage-900 group-hover:text-terracotta-700 transition-colors leading-tight">{recipe.name}</h3>
          </div>
          
          {recipe.description && (
            <p className="text-sage-600 text-sm mb-5 line-clamp-2 leading-relaxed flex-1">{recipe.description}</p>
          )}
          
          <div className="mt-auto space-y-4">
            {(recipe.skill_level_adjusted || (recipe.dietary_tags && recipe.dietary_tags.length > 0)) && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-sage-100">
                {recipe.skill_level_adjusted && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-terracotta-50 text-terracotta-700 font-sans">
                    {getSkillLevelLabel(recipe.skill_level_adjusted)}
                  </span>
                )}
                {recipe.dietary_tags?.map((tag) => (
                  <span key={tag} className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sage-50 text-sage-600 font-sans">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            {(recipe.prep_time > 0 || recipe.cook_time > 0 || totalTime > 0 || (recipe.servings != null && recipe.servings > 0)) && (
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-sage-500 uppercase tracking-wide font-sans pt-2 border-t border-sage-100">
                {totalTime > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {totalTime}m
                  </span>
                ) : null}
                {recipe.servings != null && recipe.servings > 0 && (
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    {recipe.servings}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
