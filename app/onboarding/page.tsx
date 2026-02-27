'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authFetch } from '@/lib/auth-fetch';
import { SKILL_LEVELS } from '@/lib/skill-levels';
import {
  EQUIPMENT_OPTIONS,
  APPLIANCE_OPTIONS,
  CONSTRAINT_OPTIONS,
  type KitchenContext,
} from '@/lib/kitchen-context';
import Link from 'next/link';

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [kitchenContext, setKitchenContext] = useState<KitchenContext>({});
  const [dietaryPreferences, setDietaryPreferences] = useState('');

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const res = await authFetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.onboarding_complete) {
          router.replace('/dashboard');
          return;
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await authFetch('/api/profile/onboarding-complete', {
        method: 'POST',
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError('Failed to skip. Please try again.');
      }
    } catch {
      setError('Failed to skip. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setError('');
    setSaving(true);
    try {
      const prefs = dietaryPreferences
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await authFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName || null,
          dietary_preferences: prefs,
          skill_level: skillLevel || null,
          kitchen_context: kitchenContext,
          onboarding_complete: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save');
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-sage-500">Loading...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cream-50 via-cream-100 to-sage-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-4 right-4">
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="text-sm text-sage-500 hover:text-sage-700 transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>

        <div className="max-w-lg w-full">
          <div className="bg-white rounded-lg shadow-sm border border-sage-200 p-8 space-y-6">
            <div className="text-center">
              <Link
                href="/"
                className="inline-block text-xl font-semibold tracking-tight text-terracotta-600 hover:text-terracotta-700 mb-4 transition-colors"
              >
                Cheffle
              </Link>
              <p className="text-sm text-sage-500">Step {step + 1} of 4</p>
            </div>

            {error && (
              <div className="bg-coral-50 border-l-4 border-coral-500 text-coral-800 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Step 0: Welcome */}
            {step === 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-sage-900 text-center">
                  Welcome to Cheffle
                </h2>
                <p className="text-sage-600 text-center">
                  Let&apos;s set up your profile so we can tailor recipes to you. This only takes a minute.
                </p>
                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-2">
                    Display name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 border border-sage-300 rounded-lg text-sage-900 bg-white placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
                    placeholder="Your name"
                  />
                </div>
              </div>
            )}

            {/* Step 1: Skill level */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-sage-900 text-center">
                  How would you describe your cooking?
                </h2>
                <p className="text-sage-600 text-center text-sm">
                  Recipes will be adjusted for your level—more detail for beginners, streamlined for experienced cooks.
                </p>
                <div>
                  <select
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value)}
                    className="w-full px-4 py-3 border border-sage-300 rounded-lg text-sage-900 bg-white focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
                  >
                    <option value="">Select your level</option>
                    {SKILL_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Kitchen */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-sage-900 text-center">
                  What&apos;s in your kitchen?
                </h2>
                <p className="text-sage-600 text-center text-sm">
                  We&apos;ll adapt recipes to use what you have and suggest alternatives when needed.
                </p>
                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-2">Equipment I have</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
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
                  <label className="block text-sm font-medium text-sage-700 mb-2">Appliances</label>
                  <div className="space-y-2">
                    {APPLIANCE_OPTIONS.map((opt) => {
                      const have = new Set(kitchenContext.appliances_have || []);
                      const prefer = new Set(kitchenContext.appliances_prefer || []);
                      const avoid = new Set(kitchenContext.appliances_avoid || []);
                      const hasIt = have.has(opt.value);
                      const prefersIt = prefer.has(opt.value);
                      const avoidsIt = avoid.has(opt.value);
                      return (
                        <div key={opt.value} className="flex items-center gap-3 flex-wrap">
                          <label className="flex items-center gap-1.5 text-sm min-w-[100px]">
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
                            <div className="flex gap-3 text-xs">
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
                  <label className="block text-sm font-medium text-sage-700 mb-2">Constraints</label>
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

            {/* Step 3: Dietary */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-sage-900 text-center">
                  Any dietary preferences?
                </h2>
                <p className="text-sage-600 text-center text-sm">
                  We&apos;ll suggest substitutions and adjustments when you add or modify recipes.
                </p>
                <div>
                  <input
                    type="text"
                    value={dietaryPreferences}
                    onChange={(e) => setDietaryPreferences(e.target.value)}
                    className="w-full px-4 py-3 border border-sage-300 rounded-lg text-sage-900 bg-white placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
                    placeholder="e.g. vegetarian, gluten-free, dairy-free (comma-separated)"
                  />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 0}
                className="px-4 py-2 text-sage-600 hover:text-sage-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Back
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 bg-terracotta-600 text-white rounded-lg hover:bg-terracotta-700 font-medium transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="px-6 py-2 bg-terracotta-600 text-white rounded-lg hover:bg-terracotta-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Finish'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
