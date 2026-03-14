import { SerpRecipe } from '@/lib/serp-api';

interface DiscoverRecipeCardProps {
  recipe: SerpRecipe;
  onAdd: (recipe: SerpRecipe) => void;
  isAdding?: boolean;
  isAdded?: boolean;
}

export default function DiscoverRecipeCard({ recipe, onAdd, isAdding, isAdded }: DiscoverRecipeCardProps) {
  return (
    <div className="card-base card-hover flex flex-col h-full p-6">
      <a href={recipe.link} target="_blank" rel="noopener noreferrer" className="hover:text-terracotta-600 transition-colors group/title">
        <h3 className="text-xl font-serif text-sage-900 leading-tight line-clamp-2 mb-2 group-hover/title:text-terracotta-600">{recipe.title}</h3>
      </a>

      <p className="text-sm text-sage-500 mb-4">{recipe.source}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-sage-500 uppercase tracking-wide font-sans mb-4">
        {recipe.total_time && <span>{recipe.total_time}</span>}
        {recipe.rating != null && (
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-terracotta-500">
              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
            </svg>
            {recipe.rating}
            {recipe.reviews != null && <span className="normal-case"> ({recipe.reviews} reviews)</span>}
          </span>
        )}
        {recipe.ingredients_count != null && recipe.ingredients_count > 0 && <span>{recipe.ingredients_count} ingredients</span>}
      </div>

      <div className="mt-auto pt-4 border-t border-sage-100">
        {isAdded ? (
          <div className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium rounded-full bg-sage-100 text-sage-700 border border-sage-200/60">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
            Added
          </div>
        ) : (
          <button
            onClick={() => onAdd(recipe)}
            disabled={isAdding}
            className="btn-primary w-full px-4 py-2.5 text-sm shadow-sm"
          >
            {isAdding ? 'Adding...' : 'Add to Collection'}
          </button>
        )}
      </div>
    </div>
  );
}
