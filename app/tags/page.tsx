'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Tag {
  id: number;
  name: string;
  color?: string;
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
  });

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tags', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const url = editingTag ? `/api/tags/${editingTag.id}` : '/api/tags';
      const method = editingTag ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchTags();
        setShowModal(false);
        setEditingTag(null);
        setFormData({ name: '', color: '#3B82F6' });
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save tag');
      }
    } catch (error) {
      console.error('Failed to save tag:', error);
      alert('Failed to save tag');
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color || '#3B82F6',
    });
    setShowModal(true);
  };

  const handleDelete = async (tagId: number) => {
    if (!confirm('Are you sure you want to delete this tag?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchTags();
      } else {
        alert('Failed to delete tag');
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert('Failed to delete tag');
    }
  };

  const tagCategories = {
    'Protein Types': ['chicken', 'beef', 'fish', 'vegetarian', 'vegan', 'pork'],
    'Difficulty Levels': ['easy', 'medium', 'hard'],
    'Cooking Methods': ['slow cooker', 'grill', 'stovetop', 'oven', 'instant pot'],
    'Cuisine Types': ['italian', 'american', 'mediterranean', 'mexican', 'asian', 'french'],
  };

  const categorizeTags = () => {
    const categorized: Record<string, Tag[]> = {
      'Protein Types': [],
      'Difficulty Levels': [],
      'Cooking Methods': [],
      'Cuisine Types': [],
      'Custom Tags': [],
    };

    tags.forEach((tag) => {
      let found = false;
      for (const [category, names] of Object.entries(tagCategories)) {
        if (names.includes(tag.name.toLowerCase())) {
          categorized[category].push(tag);
          found = true;
          break;
        }
      }
      if (!found) {
        categorized['Custom Tags'].push(tag);
      }
    });

    return categorized;
  };

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tags</h1>
            <p className="mt-2 text-gray-600">Organize your recipes with tags</p>
          </div>
          <button
            onClick={() => {
              setEditingTag(null);
              setFormData({ name: '', color: '#3B82F6' });
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + New Tag
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading tags...</div>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(categorizeTags()).map(([category, categoryTags]) => {
              if (categoryTags.length === 0) return null;
              return (
                <div key={category} className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">{category}</h2>
                  <div className="flex flex-wrap gap-2">
                    {categoryTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-full"
                        style={{
                          backgroundColor: tag.color ? `${tag.color}20` : '#EFF6FF',
                          color: tag.color || '#1E40AF',
                        }}
                      >
                        <span className="font-medium">{tag.name}</span>
                        <button
                          onClick={() => handleEdit(tag)}
                          className="text-xs hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tag.id)}
                          className="text-xs hover:underline text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingTag ? 'Edit Tag' : 'New Tag'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tag Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., chicken, easy, italian"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    {editingTag ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingTag(null);
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
