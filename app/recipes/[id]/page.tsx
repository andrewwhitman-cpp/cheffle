'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { decodeHtmlEntities, normalizeInstructions, parseInstructionsToSteps } from '@/lib/recipe-display';
import { getIngredientDiff, getTextDiff } from '@/lib/recipe-diff';

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

interface Recipe {
  id: number;
  name: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string;
  prep_time: number;
  cook_time: number;
  source_url?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ModifiedRecipe {
  name: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string;
  prep_time: number;
  cook_time: number;
}

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prep_time: '',
    cook_time: '',
    instructions: '',
    source_url: '',
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [pendingRecipe, setPendingRecipe] = useState<ModifiedRecipe | null>(null);

  useEffect(() => {
    if (params.id) fetchRecipe();
  }, [params.id]);

  const fetchRecipe = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/recipes/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Recipe not found');

      const data = await res.json();
      setRecipe(data);
      const decodedInstructions = decodeHtmlEntities(data.instructions || '');
      setFormData({
        name: decodeHtmlEntities(data.name),
        description: decodeHtmlEntities(data.description || ''),
        prep_time: String(data.prep_time),
        cook_time: String(data.cook_time),
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/recipes/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          instructions: normalizeInstructions(formData.instructions) || formData.instructions,
          prep_time: parseInt(formData.prep_time, 10) || 0,
          cook_time: parseInt(formData.cook_time, 10) || 0,
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
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/recipes/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
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

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !recipe) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    setPendingRecipe(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/recipes/${params.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          history: chatMessages,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to get response');

      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      if (data.modifiedRecipe) {
        setPendingRecipe(data.modifiedRecipe);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message || 'Something went wrong'}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!pendingRecipe || !recipe) return;

    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/recipes/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: pendingRecipe.name,
          description: pendingRecipe.description,
          ingredients: pendingRecipe.ingredients,
          instructions: normalizeInstructions(pendingRecipe.instructions) || pendingRecipe.instructions,
          prep_time: pendingRecipe.prep_time,
          cook_time: pendingRecipe.cook_time,
          source_url: recipe.source_url,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to apply');
      }
      setPendingRecipe(null);
      await fetchRecipe();
    } catch (err: any) {
      setError(err.message || 'Failed to apply changes');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center py-12 text-sage-500">Loading...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !recipe) {
    return (
      <ProtectedRoute>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="p-4 bg-coral-50 border border-coral-200 text-coral-800 rounded-lg">
            {error}
          </div>
          <Link href="/recipes" className="mt-4 inline-block text-terracotta-600 hover:text-terracotta-700">
            ← Back to recipes
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  if (!recipe) return null;

  const displayDescription = decodeHtmlEntities(recipe.description || '');
  const instructionSteps = parseInstructionsToSteps(recipe.instructions);

  return (
    <ProtectedRoute>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-white rounded-lg border border-sage-200 p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-sage-900 mb-2">{decodeHtmlEntities(recipe.name)}</h1>
                {displayDescription && (
                  <p className="text-sage-600">{displayDescription}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-terracotta-600 text-white rounded-lg hover:bg-terracotta-700 transition text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 border border-coral-300 text-coral-700 rounded-lg hover:bg-coral-50 transition text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>

            {recipe.source_url && (
              <div className="mb-6">
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-terracotta-600 hover:text-terracotta-700 break-all"
                >
                  View original recipe →
                </a>
              </div>
            )}

            <div className="flex gap-6 mb-6 text-sm text-sage-600">
              <span>Prep: {recipe.prep_time} min</span>
              <span>Cook: {recipe.cook_time} min</span>
              <span>Total: {recipe.prep_time + recipe.cook_time} min</span>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-medium text-sage-900 mb-3">
                Ingredients
                {pendingRecipe && (
                  <span className="ml-2 text-xs font-normal text-sage-500">(proposed changes)</span>
                )}
              </h2>
              {pendingRecipe ? (
                <ul className="space-y-1.5">
                  {getIngredientDiff(recipe.ingredients || [], pendingRecipe.ingredients).map((item, i) => (
                    <li
                      key={i}
                      className={
                        item.type === 'removed'
                          ? 'text-red-600 line-through'
                          : item.type === 'added'
                          ? 'text-green-700 bg-green-50 py-0.5 px-1 rounded'
                          : 'text-sage-700'
                      }
                    >
                      {item.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2">
                  {(recipe.ingredients || []).map((ing, i) => (
                    <li key={i} className="text-sage-700">
                      {formatIngredient(typeof ing === 'string' ? { name: ing, quantity: '', unit: '' } : ing)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="text-lg font-medium text-sage-900 mb-3">
                Instructions
                {pendingRecipe && (
                  <span className="ml-2 text-xs font-normal text-sage-500">(proposed changes)</span>
                )}
              </h2>
              {pendingRecipe ? (
                <div className="text-sage-700 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {getTextDiff(recipe.instructions || '', pendingRecipe.instructions).map((part, i) =>
                    part.added ? (
                      <span key={i} className="bg-green-100 text-green-800">
                        {part.value}
                      </span>
                    ) : part.removed ? (
                      <span key={i} className="bg-red-100 text-red-700 line-through">
                        {part.value}
                      </span>
                    ) : (
                      <span key={i}>{part.value}</span>
                    )
                  )}
                </div>
              ) : instructionSteps.length > 0 ? (
                <ol className="list-decimal list-inside space-y-3 text-sage-700">
                  {instructionSteps.map((step, i) => (
                    <li key={i} className="pl-2">
                      {decodeHtmlEntities(step)}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="whitespace-pre-wrap text-sage-700">{decodeHtmlEntities(recipe.instructions)}</div>
              )}
            </div>
          </div>

          {/* AI Chat - right column, sticky so it stays visible when scrolling */}
          <div className="bg-white rounded-lg border border-sage-200 p-6 flex flex-col lg:h-[calc(100vh-8rem)] lg:sticky lg:top-4">
            <h2 className="text-lg font-medium text-sage-900 mb-3">Modify with AI</h2>
            <p className="text-sm text-sage-600 mb-4">
              Ask the AI to change this recipe. Try &quot;add rice&quot;, &quot;double the recipe&quot;, or &quot;make it vegetarian&quot;.
            </p>

            <div className="space-y-3 mb-4 flex-1 min-h-0 overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-terracotta-50 text-sage-900 ml-4'
                      : 'bg-sage-100 text-sage-800 mr-4'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))}
              {chatLoading && (
                <div className="p-3 rounded-lg bg-sage-100 text-sage-600 text-sm">Thinking...</div>
              )}
            </div>

            {pendingRecipe && (
              <div className="mb-4 p-4 bg-cream-100 border border-cream-300 rounded-lg shrink-0">
                <p className="text-sm font-medium text-sage-800 mb-2">Changes ready to apply</p>
                <p className="text-xs text-sage-600 mb-3">Preview the diff in the recipe column on the left.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleApplyChanges}
                    className="px-4 py-2 bg-terracotta-600 text-white rounded-lg hover:bg-terracotta-700 text-sm font-medium"
                  >
                    Apply changes
                  </button>
                  <button
                    onClick={() => setPendingRecipe(null)}
                    className="px-4 py-2 border border-sage-300 text-sage-700 rounded-lg hover:bg-sage-50 text-sm font-medium"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleChatSubmit} className="flex gap-2 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="e.g. add rice, remove garlic..."
                className="flex-1 px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 text-sage-900 placeholder:text-sage-400"
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="px-4 py-2 bg-terracotta-600 text-white rounded-lg hover:bg-terracotta-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Send
              </button>
            </form>
          </div>
        </div>
        ) : (
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
                className="px-6 py-2 bg-terracotta-600 text-white rounded-lg hover:bg-terracotta-700 font-medium"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  fetchRecipe();
                }}
                className="px-6 py-2 border border-sage-300 text-sage-700 rounded-lg hover:bg-sage-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </ProtectedRoute>
  );
}
