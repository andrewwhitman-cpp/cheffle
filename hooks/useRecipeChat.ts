'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'cheffle-chat-';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ModifiedRecipe {
  name: string;
  description: string;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  instructions: string;
  prep_time: number;
  cook_time: number;
  skill_level_adjusted?: string | null;
}

interface StoredChat {
  messages: ChatMessage[];
  pendingRecipe: ModifiedRecipe | null;
}

function loadFromStorage(recipeId: string): StoredChat {
  if (typeof window === 'undefined') {
    return { messages: [], pendingRecipe: null };
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${recipeId}`);
    if (!raw) return { messages: [], pendingRecipe: null };
    const parsed = JSON.parse(raw) as StoredChat;
    return {
      messages: Array.isArray(parsed?.messages) ? parsed.messages : [],
      pendingRecipe: parsed?.pendingRecipe ?? null,
    };
  } catch {
    return { messages: [], pendingRecipe: null };
  }
}

function saveToStorage(recipeId: string, data: StoredChat) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${recipeId}`, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function useRecipeChat(recipeId: string | undefined) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [pendingRecipe, setPendingRecipe] = useState<ModifiedRecipe | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!recipeId) return;
    const stored = loadFromStorage(recipeId);
    setChatMessages(stored.messages);
    setPendingRecipe(stored.pendingRecipe);
    setHydrated(true);
  }, [recipeId]);

  useEffect(() => {
    if (!recipeId || !hydrated) return;
    saveToStorage(recipeId, { messages: chatMessages, pendingRecipe });
  }, [recipeId, hydrated, chatMessages, pendingRecipe]);

  const clearPendingRecipe = useCallback(() => {
    setPendingRecipe(null);
  }, []);

  return {
    chatMessages,
    setChatMessages,
    pendingRecipe,
    setPendingRecipe,
    clearPendingRecipe,
    chatInput,
    setChatInput,
    chatLoading,
    setChatLoading,
  };
}
