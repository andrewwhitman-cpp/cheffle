'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGate } from '@/contexts/AuthGateContext';
import { useRecipeChatContext } from '@/contexts/RecipeChatContext';
import Link from 'next/link';
import { authFetch } from '@/lib/auth-fetch';
import { decodeHtmlEntities, normalizeInstructions, parseInstructionsToSteps } from '@/lib/recipe-display';
import { scaleIngredient } from '@/lib/ingredient-parser';
import { SKILL_LEVELS, getSkillLevelLabel, getSkillLevelValue } from '@/lib/skill-levels';
import { scaleServingsDisplay } from '@/lib/servings-utils';
import ConfirmModal from '@/components/ConfirmModal';
import { isDemoRecipe, getDemoRecipe } from '@/lib/demo-recipes';

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

interface Recipe {
  id: number | string;
  name: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string;
  prep_time: number;
  cook_time: number;
  servings?: number | null;
  source_url?: string;
  skill_level_adjusted?: string | null;
  is_favorite?: boolean;
  dietary_tags?: string[];
  equipment_required?: string[];
}

interface ModifiedRecipe {
  name: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string;
  prep_time: number;
  cook_time: number;
  servings?: number | null;
  skill_level_adjusted?: string | null;
}

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { setChatOpen } = useRecipeChatContext();
  const { requireAuth } = useAuthGate();
  const recipeId = params.id as string;
  const isDemo = isDemoRecipe(recipeId);
  const canEdit = !!user && !isDemo;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prep_time: '',
    cook_time: '',
    servings: '',
    instructions: '',
    source_url: '',
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [servingScale, setServingScale] = useState(1);
  const [scaleInput, setScaleInput] = useState('1');
  const [readjusting, setReadjusting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Organization state
  const [isFavorite, setIsFavorite] = useState(false);
  const [recipeCollections, setRecipeCollections] = useState<Array<{ id: number; name: string }>>([]);
  const [allCollections, setAllCollections] = useState<Array<{ id: number; name: string }>>([]);
  const [recipeTags, setRecipeTags] = useState<Array<{ id: number; name: string }>>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);

  const parseScaleInput = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = parseFloat(trimmed);
    if (!Number.isNaN(parsed)) return parsed;
    const frac = trimmed.match(/^(\d+)\/(\d+)$/);
    if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
    return null;
  };

  const handleScaleChange = (value: string) => {
    setScaleInput(value);
    const parsed = parseScaleInput(value);
    if (parsed !== null && parsed >= 0.1 && parsed <= 20) {
      setServingScale(parsed);
    }
  };

  useEffect(() => {
    if (!recipeId) return;

    if (isDemo) {
      const demo = getDemoRecipe(recipeId);
      if (demo) {
        setRecipe(demo);
        setFormData({
          name: demo.name,
          description: demo.description || '',
          prep_time: String(demo.prep_time),
          cook_time: String(demo.cook_time),
          servings: demo.servings != null ? String(demo.servings) : '',
          instructions: demo.instructions,
          source_url: '',
        });
        setIngredients(demo.ingredients || []);
      } else {
        setError('Recipe not found');
      }
      setLoading(false);
      return;
    }

    if (!user) {
      const returnUrl = encodeURIComponent(`/recipes/${recipeId}`);
      router.push(`/login?returnUrl=${returnUrl}`);
      return;
    }

    fetchRecipe();
    fetchOrganization();
  }, [recipeId, isDemo, user]);

  const fetchRecipeRef = useRef<() => Promise<void>>();

  useEffect(() => {
    const handler = () => fetchRecipeRef.current?.();
    window.addEventListener('recipe-updated', handler);
    return () => window.removeEventListener('recipe-updated', handler);
  }, []);

  const fetchOrganization = async () => {
    if (!user || isDemo) return;
    try {
      const [colRes, tagRes, allColRes] = await Promise.all([
        authFetch(`/api/recipes/${recipeId}/collections`),
        authFetch(`/api/recipes/${recipeId}/tags`),
        authFetch('/api/collections'),
      ]);
      if (colRes.ok) setRecipeCollections(await colRes.json());
      if (tagRes.ok) setRecipeTags(await tagRes.json());
      if (allColRes.ok) setAllCollections(await allColRes.json());
    } catch { /* ignore */ }
  };

  const handleFavoriteToggle = async () => {
    if (!user || isDemo) return;
    const newVal = !isFavorite;
    setIsFavorite(newVal);
    try {
      await authFetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: newVal }),
      });
    } catch {
      setIsFavorite(!newVal);
    }
  };

  const handleAddToCollection = async (colId: number) => {
    try {
      const res = await authFetch(`/api/recipes/${recipeId}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection_ids: [colId] }),
      });
      if (res.ok) setRecipeCollections(await res.json());
    } catch { /* ignore */ }
  };

  const handleRemoveFromCollection = async (colId: number) => {
    try {
      const res = await authFetch(`/api/recipes/${recipeId}/collections?collection_id=${colId}`, {
        method: 'DELETE',
      });
      if (res.ok) setRecipeCollections((prev) => prev.filter((c) => c.id !== colId));
    } catch { /* ignore */ }
  };

  const handleCreateAndAddCollection = async () => {
    if (!newCollectionName.trim()) return;
    try {
      const createRes = await authFetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName.trim() }),
      });
      if (!createRes.ok) return;
      const newCol = await createRes.json();
      setAllCollections((prev) => [...prev, newCol]);
      await handleAddToCollection(newCol.id);
      setNewCollectionName('');
    } catch { /* ignore */ }
  };

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    try {
      const res = await authFetch(`/api/recipes/${recipeId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: [newTagInput.trim()] }),
      });
      if (res.ok) setRecipeTags(await res.json());
      setNewTagInput('');
    } catch { /* ignore */ }
  };

  const handleRemoveTag = async (tagId: number) => {
    try {
      const res = await authFetch(`/api/recipes/${recipeId}/tags?tag_id=${tagId}`, {
        method: 'DELETE',
      });
      if (res.ok) setRecipeTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch { /* ignore */ }
  };

  const fetchRecipe = async () => {
    try {
      const res = await authFetch(`/api/recipes/${recipeId}`);

      if (!res.ok) throw new Error('Recipe not found');

      const data = await res.json();
      setRecipe(data);
      setIsFavorite(!!data.is_favorite);
      const decodedInstructions = decodeHtmlEntities(data.instructions || '');
      setFormData({
        name: decodeHtmlEntities(data.name),
        description: decodeHtmlEntities(data.description || ''),
        prep_time: String(data.prep_time),
        cook_time: String(data.cook_time),
        servings: data.servings != null ? String(data.servings) : '',
        instructions: normalizeInstructions(decodedInstructions) || decodedInstructions,
        source_url: data.source_url || '',
      });
      setIngredients(data.ingredients || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };
  fetchRecipeRef.current = fetchRecipe;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await authFetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          instructions: normalizeInstructions(formData.instructions) || formData.instructions,
          prep_time: parseInt(formData.prep_time, 10) || 0,
          cook_time: parseInt(formData.cook_time, 10) || 0,
          servings: formData.servings ? parseInt(formData.servings, 10) || null : null,
          ingredients: ingredients.filter((ing) => ing.name.trim() !== ''),
          source_url: formData.source_url || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update');
      }
      await fetchRecipe();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update recipe');
    }
  };

  const handleDelete = async () => {
    try {
      const res = await authFetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/recipes');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const formatIngredient = (ing: Ingredient) => {
    const parts = [ing.quantity, ing.unit, ing.name].filter(Boolean);
    return decodeHtmlEntities(parts.join(' ').trim());
  };

  const handleSkillLevelChange = async (newLevel: string) => {
    if (!recipe || readjusting) return;
    if (!requireAuth('adjust recipes for your skill level')) return;
    const currentLevel = recipe.skill_level_adjusted ?? '';
    if (newLevel === currentLevel) return;

    setError('');
    setReadjusting(true);
    try {
      const res = await authFetch(`/api/recipes/${recipeId}/readjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_level: newLevel === '' ? null : newLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to adjust recipe');

      setRecipe(data);
      setFormData((prev) => ({
        ...prev,
        name: data.name,
        description: data.description || '',
        prep_time: String(data.prep_time),
        cook_time: String(data.cook_time),
        instructions: data.instructions || '',
        servings: data.servings != null ? String(data.servings) : '',
      }));
      setIngredients(data.ingredients || []);
    } catch (err: any) {
      setError(err.message || 'Failed to adjust recipe');
    } finally {
      setReadjusting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-4 bg-sage-200 rounded w-32 mb-8 animate-pulse" />
        <div className="bg-white rounded-lg border border-sage-200 p-6 animate-pulse">
          <div className="h-8 bg-sage-200 rounded w-3/4 mb-4" />
          <div className="h-4 bg-sage-100 rounded w-full mb-2" />
          <div className="h-4 bg-sage-100 rounded w-2/3 mb-6" />
          <div className="flex gap-4 mb-6">
            <div className="h-4 bg-sage-200 rounded w-20" />
            <div className="h-4 bg-sage-200 rounded w-20" />
            <div className="h-4 bg-sage-200 rounded w-24" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-4 bg-sage-100 rounded" style={{ width: `${90 - i * 5}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !recipe) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="p-4 bg-coral-50 border border-coral-200 text-coral-800 rounded-lg">
          {error}
        </div>
        <Link href="/recipes" className="mt-4 inline-block text-terracotta-600 hover:text-terracotta-700">
          ← Back to recipes
        </Link>
      </div>
    );
  }

  if (!recipe) return null;

  const displayDescription = decodeHtmlEntities(recipe.description || '');
  const instructionSteps = parseInstructionsToSteps(recipe.instructions);

  const handleStartCooking = () => {
    if (!requireAuth('use guided cook mode')) return;
    router.push(`/recipes/${recipe.id}/cook`);
  };

  return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/recipes" className="text-terracotta-600 hover:text-terracotta-700 text-sm font-medium">
            ← Back to recipes
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-coral-50 border border-coral-200 text-coral-800 rounded-lg">
            {error}
          </div>
        )}

        {!isEditing ? (
          <div className="animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="mb-10 text-center max-w-4xl mx-auto">
              <div className="flex flex-col items-center gap-4 mb-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-sage-900 leading-tight tracking-tight text-balance">
                  {decodeHtmlEntities(recipe.name)}
                </h1>
                
                {canEdit && (
                  <div className="flex items-center justify-center gap-2 relative">
                    <button
                      type="button"
                      onClick={() => setShowSkillDropdown(!showSkillDropdown)}
                      disabled={readjusting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-terracotta-50 text-terracotta-700 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-terracotta-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-terracotta-100 font-sans"
                    >
                      {getSkillLevelValue(recipe.skill_level_adjusted) ? `Adjusted for ${getSkillLevelLabel(recipe.skill_level_adjusted)}` : (recipe.source_url ? 'Original Recipe' : '—')}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-transform duration-200 ${showSkillDropdown ? 'rotate-180' : ''}`}>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {showSkillDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowSkillDropdown(false)} aria-hidden="true" />
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-20 w-56 bg-white border border-sage-200/60 rounded-xl shadow-lg py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                          <button
                            type="button"
                            disabled={!recipe.source_url}
                            onClick={() => { handleSkillLevelChange(''); setShowSkillDropdown(false); }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors ${getSkillLevelValue(recipe.skill_level_adjusted) === '' ? 'bg-terracotta-50 text-terracotta-700' : 'text-sage-700 hover:bg-sage-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <span>{recipe.source_url ? 'Original Recipe' : '—'}</span>
                            {getSkillLevelValue(recipe.skill_level_adjusted) === '' && (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-terracotta-600">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                          {SKILL_LEVELS.map((level) => {
                            const isActive = getSkillLevelValue(recipe.skill_level_adjusted) === level.value;
                            return (
                              <button
                                key={level.value}
                                type="button"
                                onClick={() => { handleSkillLevelChange(level.value); setShowSkillDropdown(false); }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-terracotta-50 text-terracotta-700' : 'text-sage-700 hover:bg-sage-50'}`}
                              >
                                <span>Adjusted for {level.label}</span>
                                {isActive && (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-terracotta-600">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                    
                    {readjusting && (
                      <span className="text-xs text-sage-500 uppercase tracking-wider font-sans absolute left-full ml-3 whitespace-nowrap">Adjusting...</span>
                    )}
                  </div>
                )}
                {!canEdit && recipe.skill_level_adjusted && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-terracotta-50 text-terracotta-700 font-sans">
                    {getSkillLevelLabel(recipe.skill_level_adjusted)}
                  </span>
                )}
              </div>

              {displayDescription && (
                <p className="text-lg md:text-xl text-sage-600 font-light leading-relaxed mb-8 max-w-3xl mx-auto">
                  {displayDescription}
                </p>
              )}

              {/* Action Bar */}
              <div className="flex flex-wrap justify-center items-center gap-4 mb-10 border-y border-sage-200/60 py-6">
                <button onClick={handleStartCooking} className="btn-primary px-8 py-3 text-base shadow-[0_4px_14px_-6px_rgba(200,75,49,0.4)]">
                  Start cooking
                </button>
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  className="btn-secondary px-6 py-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={20} height={20} className="shrink-0 mr-2 -ml-1" aria-hidden>
                    <ellipse cx="16" cy="11" rx="9" ry="3.5" fill="currentColor" />
                    <rect x="9" y="11" width="14" height="12" fill="currentColor" />
                  </svg>
                  Ask Cheffle
                </button>
                {canEdit && (
                  <>
                    <button onClick={() => setIsEditing(true)} className="btn-ghost">
                      Edit
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="btn-ghost text-coral-600 hover:bg-coral-50"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>

              {/* Meta info (Time & Yield) */}
              <div className="flex flex-wrap justify-center gap-8 md:gap-16 text-sm font-sans uppercase tracking-widest text-sage-500">
                {recipe.prep_time > 0 && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-sage-400">Prep Time</span>
                    <span className="font-medium text-sage-800">{recipe.prep_time} mins</span>
                  </div>
                )}
                {recipe.cook_time > 0 && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-sage-400">Cook Time</span>
                    <span className="font-medium text-sage-800">{recipe.cook_time} mins</span>
                  </div>
                )}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-sage-400">Total Time</span>
                  <span className="font-medium text-sage-800">{recipe.prep_time + recipe.cook_time} mins</span>
                </div>
                {scaleServingsDisplay(recipe.servings ?? null, servingScale) != null && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-sage-400">Yield</span>
                    <span className="font-medium text-sage-800">{scaleServingsDisplay(recipe.servings ?? null, servingScale)} servings</span>
                  </div>
                )}
              </div>
            </div>

            {/* Split Pane Layout */}
            <div className="flex flex-col md:flex-row gap-12 lg:gap-24 relative border-t border-sage-200/60 pt-12">
              
              {/* Left Column: Ingredients & Organization */}
              <div className="w-full md:w-1/3 lg:w-[350px] shrink-0 space-y-12">
                <div className="sticky top-24">
                  <div className="mb-10">
                    <div className="flex items-end justify-between mb-6 pb-4 border-b border-sage-200/60">
                      <h2 className="text-2xl font-serif text-sage-900">Ingredients</h2>
                      <div className="flex items-center gap-2 bg-sage-50/50 rounded-lg p-1 border border-sage-200/60">
                        <span className="text-[10px] uppercase tracking-wider text-sage-500 font-semibold px-2">Scale</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={scaleInput}
                          onChange={(e) => handleScaleChange(e.target.value)}
                          onBlur={() => setScaleInput(String(servingScale))}
                          placeholder="1"
                          className="w-10 bg-white text-center text-sm font-medium text-sage-800 border-none rounded py-0.5 focus:ring-2 focus:ring-terracotta-500"
                        />
                        <span className="text-xs text-sage-400 pr-2">×</span>
                      </div>
                    </div>
                    <ul className="space-y-4">
                      {(recipe.ingredients || []).map((ing, i) => {
                        const scaled = scaleIngredient(
                          typeof ing === 'string' ? { name: ing, quantity: '', unit: '' } : ing,
                          servingScale
                        );
                        return (
                          <li key={i} className="flex items-start gap-3 text-sage-800 text-base leading-relaxed">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-terracotta-300 shrink-0" />
                            {formatIngredient(scaled)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Organization (Collections, Tags) */}
                  {canEdit && (
                    <div className="pt-8 border-t border-sage-200/60">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-sage-400 mb-4 font-sans">Organization</h3>
                      
                      <div className="space-y-4">
                        <button
                          type="button"
                          onClick={handleFavoriteToggle}
                          className={`flex w-full items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                            isFavorite
                              ? 'bg-terracotta-50 text-terracotta-700 shadow-[inset_0_0_0_1px_#F2CDCA]'
                              : 'bg-white text-sage-600 hover:bg-sage-50 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`w-5 h-5 ${isFavorite ? 'fill-terracotta-500' : 'fill-none stroke-current'}`} strokeWidth={isFavorite ? 0 : 1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                            </svg>
                            {isFavorite ? 'Saved to Favorites' : 'Add to Favorites'}
                          </span>
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowCollectionPicker(!showCollectionPicker)}
                            className="flex w-full items-center justify-between px-4 py-3 rounded-xl text-sm font-medium bg-white text-sage-600 hover:bg-sage-50 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-300"
                          >
                            <span className="flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-sage-400">
                                <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
                              </svg>
                              Manage Collections
                            </span>
                            <span className="text-xs bg-sage-100 text-sage-600 px-2 py-0.5 rounded-full">{recipeCollections.length}</span>
                          </button>
                          {showCollectionPicker && (
                            <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white border border-sage-200/60 rounded-xl shadow-lg p-4">
                              {allCollections.length > 0 && (
                                <div className="space-y-1 mb-4 max-h-48 overflow-y-auto pr-2">
                                  {allCollections.map((col) => {
                                    const isIn = recipeCollections.some((rc) => rc.id === col.id);
                                    return (
                                      <label key={col.id} className="flex items-center gap-3 text-sm text-sage-700 cursor-pointer hover:bg-sage-50 px-3 py-2 rounded-lg transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={isIn}
                                          onChange={() => isIn ? handleRemoveFromCollection(col.id) : handleAddToCollection(col.id)}
                                          className="rounded border-sage-300 text-terracotta-600 focus:ring-terracotta-500 w-4 h-4"
                                        />
                                        {col.name}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newCollectionName}
                                  onChange={(e) => setNewCollectionName(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateAndAddCollection())}
                                  placeholder="New collection name"
                                  className="flex-1 px-3 py-2 bg-sage-50/50 border border-sage-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-terracotta-500 focus:border-transparent outline-none transition-all"
                                />
                                <button type="button" onClick={handleCreateAndAddCollection} className="px-4 py-2 bg-sage-800 text-white font-medium rounded-lg hover:bg-sage-900 transition-colors text-sm">
                                  Add
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Tag Input */}
                        <div className="bg-white rounded-xl shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] p-4">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {recipeTags.map((tag) => (
                              <span key={tag.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sage-100 text-sage-700 font-sans">
                                {tag.name}
                                <button type="button" onClick={() => handleRemoveTag(tag.id)} className="text-sage-400 hover:text-sage-700 hover:bg-sage-200 rounded-sm">&times;</button>
                              </span>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                            placeholder="Add tag (e.g. Vegetarian, Quick)"
                            className="w-full px-3 py-2 bg-sage-50/50 border border-sage-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-terracotta-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {recipe.source_url && (
                    <div className="mt-8 pt-8 border-t border-sage-200/60 text-center">
                      <a
                        href={recipe.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-sage-500 hover:text-terracotta-600 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                        View Original Recipe
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Instructions */}
              <div className="flex-1 pb-24">
                <h2 className="text-2xl font-serif text-sage-900 mb-8 pb-4 border-b border-sage-200/60">Instructions</h2>
                {instructionSteps.length > 0 ? (
                  <div className="space-y-10">
                    {instructionSteps.map((step, i) => (
                      <div key={i} className="flex gap-6 group">
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-sage-100 text-sage-600 font-serif text-lg font-medium group-hover:bg-terracotta-100 group-hover:text-terracotta-700 transition-colors">
                            {i + 1}
                          </span>
                          {i !== instructionSteps.length - 1 && (
                            <div className="w-px h-full bg-sage-200/60 my-2" />
                          )}
                        </div>
                        <p className="text-lg text-sage-800 leading-relaxed pt-0.5">
                          {decodeHtmlEntities(step)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="prose prose-sage prose-lg max-w-none text-sage-800">
                    {decodeHtmlEntities(recipe.instructions).split('\n').map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
          <form onSubmit={handleUpdate} className="bg-white rounded-lg border border-sage-200 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-sage-700 mb-2">Recipe name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-sage-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-sage-700 mb-2">Source URL</label>
              <input
                type="url"
                value={formData.source_url}
                onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">Prep time (min)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.prep_time}
                  onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
                  className="w-full px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">Cook time (min)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.cook_time}
                  onChange={(e) => setFormData({ ...formData, cook_time: e.target.value })}
                  className="w-full px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">Servings</label>
                <input
                  type="number"
                  min={1}
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                  placeholder="e.g. 4"
                  className="w-full px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-sage-700 mb-2">Ingredients</label>
              <div className="space-y-3">
                {ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={ing.name}
                      onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                      className="flex-1 px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                    />
                    <input
                      type="text"
                      placeholder="Qty"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(i, 'quantity', e.target.value)}
                      className="w-20 px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                      className="w-24 px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                    />
                    {ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeIngredient(i)}
                        className="px-3 py-2 text-coral-600 hover:bg-coral-50 rounded-lg text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addIngredient}
                  className="text-terracotta-600 hover:text-terracotta-700 text-sm font-medium"
                >
                  + Add ingredient
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-sage-700 mb-2">Instructions *</label>
              <textarea
                required
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={8}
                className="w-full px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="btn-primary px-6 py-2"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  fetchRecipe();
                }}
                className="btn-secondary px-6 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
          </div>
        )}

        {canEdit && (
          <ConfirmModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDelete}
            title="Delete recipe"
            message={`Are you sure you want to delete "${decodeHtmlEntities(recipe.name)}"? This cannot be undone.`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            variant="danger"
          />
        )}
      </div>
  );
}
