'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { SKILL_LEVELS } from '@/lib/skill-levels';
import {
  EQUIPMENT_OPTIONS,
  APPLIANCE_OPTIONS,
  CONSTRAINT_OPTIONS,
  type KitchenContext,
} from '@/lib/kitchen-context';

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState('');
  const [dietaryPreferences, setDietaryPreferences] = useState('');
  const [skillLevel, setSkillLevel] = useState<string>('');
  const [kitchenContext, setKitchenContext] = useState<KitchenContext>({});
  const [kitchenExpanded, setKitchenExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDisplayName(data.display_name || '');
        setDietaryPreferences(
          Array.isArray(data.dietary_preferences)
            ? data.dietary_preferences.join(', ')
            : data.dietary_preferences || ''
        );
        setSkillLevel(data.skill_level || '');
        setKitchenContext(data.kitchen_context || {});
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const prefs = dietaryPreferences
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: displayName || null,
          dietary_preferences: prefs,
          skill_level: skillLevel || null,
          kitchen_context: kitchenContext,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="max-w-xl mx-auto px-4 py-12 text-center text-sage-600">
          Loading...
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-sage-900 mb-6">Profile</h1>

        {error && (
          <div className="mb-6 p-4 bg-coral-50 border border-coral-200 text-coral-800 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-2">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sage-700 mb-2">
              Cooking skill level
            </label>
            <p className="text-xs text-sage-500 mb-2">
              Recipes you import or modify will be adjusted for your level. This affects instructions, prep steps, and tips.
            </p>
            <select
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              className="w-full px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 bg-white"
            >
              <option value="">No adjustment (use recipe as-is)</option>
              {SKILL_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setKitchenExpanded(!kitchenExpanded)}
              className="flex items-center justify-between w-full text-left text-sm font-medium text-sage-700 mb-2 py-1"
            >
              Kitchen setup
              <span className="text-sage-500">{kitchenExpanded ? '−' : '+'}</span>
            </button>
            <p className="text-xs text-sage-500 mb-3">
              Help tailor recipes to your equipment, appliances, and preferences.
            </p>
            {kitchenExpanded && (
              <div className="space-y-6 pl-0 border-l-2 border-sage-200 pl-4">
                <div>
                  <label className="block text-xs font-medium text-sage-600 mb-2">Equipment I have</label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map((opt) => {
                      const have = new Set(kitchenContext.equipment_have || []);
                      const checked = have.has(opt.value);
                      return (
                        <label key={opt.value} className="flex items-center gap-1.5 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = toggleInSet(have, opt.value);
                              setKitchenContext({
                                ...kitchenContext,
                                equipment_have: Array.from(next),
                              });
                            }}
                            className="rounded border-sage-300 text-terracotta-600 focus:ring-terracotta-500"
                          />
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-sage-600 mb-2">Appliances</label>
                  <div className="space-y-2">
                    {APPLIANCE_OPTIONS.map((opt) => {
                      const have = new Set(kitchenContext.appliances_have || []);
                      const prefer = new Set(kitchenContext.appliances_prefer || []);
                      const avoid = new Set(kitchenContext.appliances_avoid || []);
                      const hasIt = have.has(opt.value);
                      const prefersIt = prefer.has(opt.value);
                      const avoidsIt = avoid.has(opt.value);
                      return (
                        <div key={opt.value} className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-sm min-w-[120px]">
                            <input
                              type="checkbox"
                              checked={hasIt}
                              onChange={() => {
                                const nextHave = new Set(have);
                                const nextPrefer = new Set(prefer);
                                const nextAvoid = new Set(avoid);
                                if (hasIt) {
                                  nextHave.delete(opt.value);
                                  nextPrefer.delete(opt.value);
                                  nextAvoid.add(opt.value);
                                } else {
                                  nextHave.add(opt.value);
                                  nextAvoid.delete(opt.value);
                                }
                                setKitchenContext({
                                  ...kitchenContext,
                                  appliances_have: Array.from(nextHave),
                                  appliances_prefer: Array.from(nextPrefer),
                                  appliances_avoid: Array.from(nextAvoid),
                                });
                              }}
                              className="rounded border-sage-300 text-terracotta-600 focus:ring-terracotta-500"
                            />
                            {opt.label}
                          </label>
                          {hasIt && (
                            <div className="flex gap-4 text-xs">
                              <label className="flex items-center gap-1">
                                <input
                                  type="radio"
                                  name={`appliance-${opt.value}`}
                                  checked={prefersIt}
                                  onChange={() => {
                                    const nextPrefer = new Set(prefer);
                                    const nextAvoid = new Set(avoid);
                                    nextPrefer.add(opt.value);
                                    nextAvoid.delete(opt.value);
                                    setKitchenContext({
                                      ...kitchenContext,
                                      appliances_prefer: Array.from(nextPrefer),
                                      appliances_avoid: Array.from(nextAvoid),
                                    });
                                  }}
                                  className="text-terracotta-600"
                                />
                                Prefer
                              </label>
                              <label className="flex items-center gap-1">
                                <input
                                  type="radio"
                                  name={`appliance-${opt.value}`}
                                  checked={!prefersIt && !avoidsIt}
                                  onChange={() => {
                                    const nextPrefer = new Set(prefer);
                                    const nextAvoid = new Set(avoid);
                                    nextPrefer.delete(opt.value);
                                    nextAvoid.delete(opt.value);
                                    setKitchenContext({
                                      ...kitchenContext,
                                      appliances_prefer: Array.from(nextPrefer),
                                      appliances_avoid: Array.from(nextAvoid),
                                    });
                                  }}
                                  className="text-terracotta-600"
                                />
                                Neutral
                              </label>
                              <label className="flex items-center gap-1">
                                <input
                                  type="radio"
                                  name={`appliance-${opt.value}`}
                                  checked={avoidsIt}
                                  onChange={() => {
                                    const nextPrefer = new Set(prefer);
                                    const nextAvoid = new Set(avoid);
                                    nextPrefer.delete(opt.value);
                                    nextAvoid.add(opt.value);
                                    setKitchenContext({
                                      ...kitchenContext,
                                      appliances_prefer: Array.from(nextPrefer),
                                      appliances_avoid: Array.from(nextAvoid),
                                    });
                                  }}
                                  className="text-terracotta-600"
                                />
                                Avoid
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-sage-600 mb-2">Constraints</label>
                  <div className="flex flex-wrap gap-2">
                    {CONSTRAINT_OPTIONS.map((opt) => {
                      const constraints = new Set(kitchenContext.constraints || []);
                      const checked = constraints.has(opt.value);
                      return (
                        <label key={opt.value} className="flex items-center gap-1.5 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = toggleInSet(constraints, opt.value);
                              setKitchenContext({
                                ...kitchenContext,
                                constraints: Array.from(next),
                              });
                            }}
                            className="rounded border-sage-300 text-terracotta-600 focus:ring-terracotta-500"
                          />
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-sage-700 mb-2">
              Dietary preferences
            </label>
            <input
              type="text"
              value={dietaryPreferences}
              onChange={(e) => setDietaryPreferences(e.target.value)}
              className="w-full px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
              placeholder="e.g. vegetarian, gluten-free, dairy-free (comma-separated)"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-terracotta-600 text-white px-6 py-2 rounded-lg hover:bg-terracotta-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </ProtectedRoute>
  );
}
