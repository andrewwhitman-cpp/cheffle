'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export interface CookingContext {
  currentStepIndex: number;
  currentStepText: string;
  totalSteps: number;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
}

interface RecipeChatContextType {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  recipeId: string | null;
  cookingContext: CookingContext | null;
  setCookingContext: (ctx: CookingContext | null) => void;
}

const RecipeChatContext = createContext<RecipeChatContextType | undefined>(undefined);

export function RecipeChatProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(false);
  const [cookingContext, setCookingContextState] = useState<CookingContext | null>(null);

  const recipeId = useMemo(() => {
    const match = pathname?.match(/^\/recipes\/([^/]+)(?:\/|$)/);
    return match ? match[1] : null;
  }, [pathname]);

  const setCookingContext = useCallback((ctx: CookingContext | null) => {
    setCookingContextState(ctx);
  }, []);

  const value = useMemo(
    () => ({ chatOpen, setChatOpen, recipeId, cookingContext, setCookingContext }),
    [chatOpen, recipeId, cookingContext, setCookingContext]
  );

  return (
    <RecipeChatContext.Provider value={value}>
      {children}
    </RecipeChatContext.Provider>
  );
}

export function useRecipeChatContext() {
  const context = useContext(RecipeChatContext);
  if (context === undefined) {
    throw new Error('useRecipeChatContext must be used within RecipeChatProvider');
  }
  return context;
}
