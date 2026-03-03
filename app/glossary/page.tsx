'use client';

import { useState, useMemo } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { glossaryTerms } from '@/lib/glossary-data';

export default function GlossaryPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTerms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return glossaryTerms;
    return glossaryTerms.filter(
      (t) =>
        t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-sage-900 mb-6">Glossary</h1>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search cooking terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500"
          />
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-16rem)] pr-2">
          {filteredTerms.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-sage-300 rounded-lg">
              <p className="text-sage-600">No terms match your search.</p>
            </div>
          ) : (
            <ul className="space-y-6">
              {filteredTerms.map((item) => (
                <li
                  key={item.term}
                  className="border-b border-sage-200 pb-6 last:border-b-0 last:pb-0"
                >
                  <h2 className="text-lg font-medium text-sage-900 mb-1">
                    {item.term}
                  </h2>
                  <p className="text-sage-600 text-sm leading-relaxed">
                    {item.definition}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
