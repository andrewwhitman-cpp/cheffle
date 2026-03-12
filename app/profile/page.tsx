'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { SKILL_LEVELS } from '@/lib/skill-levels';
import { authFetch } from '@/lib/auth-fetch';
import {
  EQUIPMENT_OPTIONS,
  APPLIANCE_OPTIONS,
  CONSTRAINT_OPTIONS,
  type KitchenContext,
} from '@/lib/kitchen-context';

type ProfileSection = 'account' | 'cooking' | 'kitchen';

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

const SIDEBAR_ITEMS: { id: ProfileSection; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'cooking', label: 'Cooking' },
  { id: 'kitchen', label: 'Kitchen' },
];

export default function ProfilePage() {
  const [activeSection, setActiveSection] = useState<ProfileSection>('account');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [dietaryPreferences, setDietaryPreferences] = useState('');
  const [skillLevel, setSkillLevel] = useState<string>('');
  const [unitPreference, setUnitPreference] = useState<string>('metric');
  const [kitchenContext, setKitchenContext] = useState<KitchenContext>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authFetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setDisplayName(data.display_name || '');
        setUsername(data.username || '');
        setEmail(data.email || '');
        setDietaryPreferences(
          Array.isArray(data.dietary_preferences)
            ? data.dietary_preferences.join(', ')
            : data.dietary_preferences || ''
        );
        setSkillLevel(data.skill_level || '');
        setUnitPreference(data.unit_preference || 'metric');
        setKitchenContext(data.kitchen_context || {});
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
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
          unit_preference: unitPreference,
          kitchen_context: kitchenContext,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save');
      }

      setSuccess('Profile saved successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await authFetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      setPasswordSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-sage-900 mb-6">Profile</h1>

        <div className="flex flex-col sm:flex-row gap-8">
          {/* Sidebar */}
          <nav className="w-full sm:w-48 shrink-0">
            <ul className="space-y-1 border-b sm:border-b-0 sm:border-r border-sage-200 pb-4 sm:pb-0 sm:pr-6">
              {SIDEBAR_ITEMS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === item.id
                        ? 'bg-terracotta-50 text-terracotta-700 border-l-2 sm:border-l-4 border-terracotta-500'
                        : 'text-sage-600 hover:bg-sage-50 hover:text-sage-900'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeSection === 'account' && (
              <div className="space-y-8">
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <h2 className="text-lg font-medium text-sage-900">Account details</h2>
                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      Display name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full max-w-md px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      readOnly
                      className="w-full max-w-md px-4 py-2 border border-sage-200 rounded-lg bg-sage-50 text-sage-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full max-w-md px-4 py-2 border border-sage-200 rounded-lg bg-sage-50 text-sage-600 cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    {error && (
                      <span className="text-coral-700 text-sm">{error}</span>
                    )}
                    {success && (
                      <span className="text-sage-700 text-sm">{success}</span>
                    )}
                  </div>
                </form>

                <form onSubmit={handlePasswordSubmit} className="space-y-6 pt-8 border-t border-sage-200">
                  <h2 className="text-lg font-medium text-sage-900">Change password</h2>
                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      Current password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full max-w-md px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      New password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full max-w-md px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sage-700 mb-2">
                      Confirm new password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full max-w-md px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {passwordSaving ? 'Updating...' : 'Update password'}
                    </button>
                    {passwordError && (
                      <span className="text-coral-700 text-sm">{passwordError}</span>
                    )}
                    {passwordSuccess && (
                      <span className="text-sage-700 text-sm">{passwordSuccess}</span>
                    )}
                  </div>
                </form>
              </div>
            )}

            {activeSection === 'cooking' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <h2 className="text-lg font-medium text-sage-900">Cooking preferences</h2>
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
                    className="w-full max-w-md px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 bg-white"
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
                  <label className="block text-sm font-medium text-sage-700 mb-2">
                    Dietary preferences
                  </label>
                  <input
                    type="text"
                    value={dietaryPreferences}
                    onChange={(e) => setDietaryPreferences(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
                    placeholder="e.g. vegetarian, gluten-free, dairy-free (comma-separated)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-2">
                    Unit system
                  </label>
                  <p className="text-xs text-sage-500 mb-2">
                    AI-modified recipes will use your preferred units.
                  </p>
                  <select
                    value={unitPreference}
                    onChange={(e) => setUnitPreference(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 bg-white"
                  >
                    <option value="metric">Metric (g, ml, °C)</option>
                    <option value="imperial">Imperial (oz, cups, °F)</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  {error && (
                    <span className="text-coral-700 text-sm">{error}</span>
                  )}
                  {success && (
                    <span className="text-sage-700 text-sm">{success}</span>
                  )}
                </div>
              </form>
            )}

            {activeSection === 'kitchen' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <h2 className="text-lg font-medium text-sage-900">Kitchen setup</h2>
                <p className="text-sm text-sage-500">
                  Help tailor recipes to your equipment, appliances, and preferences.
                </p>
                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-2">Equipment I have</label>
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
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  {error && (
                    <span className="text-coral-700 text-sm">{error}</span>
                  )}
                  {success && (
                    <span className="text-sage-700 text-sm">{success}</span>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
