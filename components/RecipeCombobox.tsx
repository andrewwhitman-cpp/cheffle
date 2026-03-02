'use client';

import { useState, useRef, useEffect } from 'react';

interface Recipe {
  id: number;
  name: string;
}

interface RecipeComboboxProps {
  recipes: Recipe[];
  value: number | null;
  onChange: (recipeId: number | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  recipeRemoved?: boolean;
  removedRecipeId?: number;
  listMaxHeight?: string;
  /** When true, renders input + list stacked (input sticky, list scrolls). For use in popovers. */
  stackedLayout?: boolean;
  autoFocus?: boolean;
}

export default function RecipeCombobox({
  recipes,
  value,
  onChange,
  placeholder = 'Select recipe',
  className = '',
  disabled = false,
  recipeRemoved = false,
  removedRecipeId,
  listMaxHeight = 'max-h-48',
  stackedLayout = false,
  autoFocus = false,
}: RecipeComboboxProps) {
  const [isOpen, setIsOpen] = useState(stackedLayout);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedRecipe = value != null ? recipes.find((r) => r.id === value) : null;
  const displayValue = selectedRecipe?.name ?? (recipeRemoved && removedRecipeId ? 'Recipe removed' : '');
  const filterLower = inputValue.trim().toLowerCase();
  const filteredRecipes = filterLower
    ? recipes.filter((r) => r.name.toLowerCase().includes(filterLower))
    : [...recipes];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setInputValue('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    setInputValue(displayValue);
  };

  const handleBlur = () => {
    setIsOpen(false);
    setInputValue('');
  };

  const handleSelect = (recipeId: number | null) => {
    onChange(recipeId);
    setIsOpen(false);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
      (e.target as HTMLInputElement).blur();
    }
  };

  const listContent = (
    <ul
      className={
        stackedLayout
          ? 'flex-1 min-h-0 overflow-auto rounded-lg border border-sage-200 bg-white py-1 shadow-inner mt-2'
          : `absolute z-10 mt-1 left-0 right-0 overflow-auto rounded-lg border border-sage-200 bg-white py-1 shadow-lg ${listMaxHeight}`
      }
    >
      <li>
        <button
          type="button"
          className={`w-full px-4 py-2 text-left text-sm hover:bg-sage-100 focus:bg-sage-100 focus:outline-none ${
            value == null ? 'bg-terracotta-50 text-terracotta-800' : 'text-sage-600'
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            handleSelect(null);
          }}
        >
          — Select recipe —
        </button>
      </li>
      {filteredRecipes.length === 0 ? (
        <li className="px-4 py-2 text-sm text-sage-500">No matching recipes</li>
      ) : (
        filteredRecipes.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className={`w-full px-4 py-2 text-left text-sm hover:bg-sage-100 focus:bg-sage-100 focus:outline-none ${
                r.id === value ? 'bg-terracotta-50 text-terracotta-800' : 'text-sage-800'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(r.id);
              }}
            >
              {r.name}
            </button>
          </li>
        ))
      )}
    </ul>
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${stackedLayout ? 'flex flex-1 flex-col min-h-0' : 'flex-1'} ${className}`}
    >
      <input
        type="text"
        value={isOpen ? inputValue : displayValue || ''}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`flex-1 min-w-0 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 bg-white text-sage-900 placeholder:text-sage-400 ${
          recipeRemoved ? 'border-coral-300 bg-coral-50' : 'border-sage-300'
        } ${stackedLayout ? 'flex-shrink-0' : ''}`}
        autoComplete="off"
        autoFocus={autoFocus}
      />
      {isOpen && listContent}
    </div>
  );
}
