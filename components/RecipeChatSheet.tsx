'use client';

import { useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthGate } from '@/contexts/AuthGateContext';
import { useRecipeChatContext } from '@/contexts/RecipeChatContext';
import { authFetch } from '@/lib/auth-fetch';
import { useRecipeChat } from '@/hooks/useRecipeChat';
import { useVoiceMode } from '@/hooks/useVoiceMode';
import { normalizeInstructions } from '@/lib/recipe-display';

interface RecipeChatSheetProps {
  recipeId: string;
  onClose: () => void;
}

function XMarkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
  );
}

export default function RecipeChatSheet({ recipeId, onClose }: RecipeChatSheetProps) {
  const pathname = usePathname();
  const isCookMode = pathname?.endsWith('/cook');
  const { requireAuth } = useAuthGate();
  const { cookingContext } = useRecipeChatContext();
  const {
    chatMessages,
    setChatMessages,
    pendingRecipe,
    setPendingRecipe,
    clearPendingRecipe,
    clearChat,
    chatInput,
    setChatInput,
    chatLoading,
    setChatLoading,
  } = useRecipeChat(recipeId);

  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const dragYRef = useRef(0);

  const sendChatMessage = useCallback(
    async (userMessage: string) => {
      setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
      setChatLoading(true);
      setPendingRecipe(null);

      try {
        const body: Record<string, unknown> = {
          message: userMessage,
          history: chatMessages,
        };
        if (cookingContext) {
          body.cookingContext = cookingContext;
        }
        const res = await authFetch(`/api/recipes/${recipeId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to get response');

        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
        if (data.modifiedRecipe) {
          setPendingRecipe(data.modifiedRecipe);
        }
        return data.message;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${msg}` },
        ]);
        return null;
      } finally {
        setChatLoading(false);
      }
    },
    [chatMessages, recipeId, cookingContext, setChatMessages, setChatLoading, setPendingRecipe]
  );

  const {
    voiceEnabled,
    setVoiceEnabled,
    isVoiceSupported,
    isListening,
    speakResponses,
    setSpeakResponses,
  } = useVoiceMode({
    onQueryDetected: async (query, speak, speakEnabled) => {
      const response = await sendChatMessage(query);
      if (response && speakEnabled) speak(response);
    },
    continuousMode: true,
  });

  const handleChatSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim() || chatLoading) return;
      if (!requireAuth('use AI chat to customize recipes')) return;

      const userMessage = chatInput.trim();
      setChatInput('');
      await sendChatMessage(userMessage);
    },
    [chatInput, chatLoading, requireAuth, setChatInput, sendChatMessage]
  );

  const handleApplyChanges = useCallback(async () => {
    if (!pendingRecipe) return;
    if (!requireAuth('apply recipe changes')) return;

    setChatLoading(true);
    try {
      const res = await authFetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pendingRecipe.name,
          description: pendingRecipe.description,
          ingredients: pendingRecipe.ingredients,
          instructions: normalizeInstructions(pendingRecipe.instructions) || pendingRecipe.instructions,
          prep_time: pendingRecipe.prep_time,
          cook_time: pendingRecipe.cook_time,
          servings: pendingRecipe.servings ?? null,
          source_url: null,
          skill_level_adjusted: pendingRecipe.skill_level_adjusted ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to apply');
      }
      clearPendingRecipe();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('recipe-updated'));
      }
      onClose();
    } catch {
      // Error shown in chat
    } finally {
      setChatLoading(false);
    }
  }, [pendingRecipe, recipeId, requireAuth, clearPendingRecipe, onClose]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    dragYRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const y = e.touches[0].clientY;
    const delta = y - startY.current;
    if (delta > 0) {
      dragYRef.current = delta;
      setDragY(delta);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragYRef.current > 80) {
      onClose();
    }
    dragYRef.current = 0;
    setDragY(0);
  }, [onClose]);

  const sheetContent = (
    <>
        {/* Drag handle + header */}
        <div
          className="relative flex items-center justify-between px-6 pt-5 pb-4 border-b border-sage-200/60 shrink-0 touch-none md:pt-6"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 rounded-full bg-sage-200 absolute left-1/2 -translate-x-1/2 top-2.5 md:hidden" />
          <div className="w-20 flex justify-start">
            {chatMessages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                disabled={chatLoading}
                className="text-xs font-bold uppercase tracking-widest text-sage-500 hover:text-sage-900 disabled:opacity-50 disabled:cursor-not-allowed py-1 font-sans transition-colors"
              >
                New chat
              </button>
            )}
          </div>
          <h2 className="flex-1 text-2xl font-serif text-sage-900 text-center">Talk with Cheffle</h2>
          <div className="w-20 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 rounded-full text-sage-400 hover:bg-sage-50 hover:text-sage-900 shrink-0 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-4">
          <p className="text-sm text-sage-600 mb-4">
            I&apos;m here to help! Ask me to tweak this recipe—add rice, make it vegetarian, double it, or anything else.
          </p>

          {isVoiceSupported && (
            <div className="mb-4 p-3 bg-sage-50 border border-sage-200 rounded-lg">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  title={voiceEnabled ? 'Disable voice mode' : 'Enable voice mode'}
                  className={`p-2 rounded-lg transition shrink-0 ${
                    voiceEnabled ? 'bg-terracotta-100 text-terracotta-700' : 'bg-white border border-sage-200 text-sage-600 hover:bg-sage-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                    <path d="M4 10a8 8 0 0 0 16 0v2a8 8 0 0 1-16 0V10z" />
                  </svg>
                </button>
                {voiceEnabled ? (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-sage-700">
                        {isListening
                          ? 'Listening... Say "Chef" then your question.'
                          : 'Say "Chef" then your question.'}
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-sage-600 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={speakResponses}
                        onChange={(e) => setSpeakResponses(e.target.checked)}
                        className="rounded border-sage-300"
                      />
                      Speak
                    </label>
                  </>
                ) : (
                  <p className="text-sm text-sage-600">Tap the mic to ask questions by voice</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3 mb-4 flex-1 min-h-0 overflow-y-auto">
            {chatMessages.length === 0 && !chatLoading && (
              <p className="text-sm text-sage-500 italic py-4">What would you like to change? Just ask!</p>
            )}
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
              <div className="p-3 rounded-lg bg-sage-100 text-sage-600 text-sm">
                <span className="animate-pulse">Cheffle is thinking...</span>
              </div>
            )}
          </div>

          {pendingRecipe && (
            <div className="mb-4 p-4 bg-cream-100 border border-cream-300 rounded-lg shrink-0">
              <p className="text-sm font-medium text-sage-800 mb-2">I&apos;ve got some changes for you!</p>
              <p className="text-xs text-sage-600 mb-3">Take a look at the recipe to see what I suggested.</p>
              <div className="flex gap-2">
                <button onClick={handleApplyChanges} disabled={chatLoading} className="btn-primary px-4 py-2 text-sm">
                  Use these changes
                </button>
                <button
                  onClick={clearPendingRecipe}
                  className="px-4 py-2 border border-sage-300 text-sage-700 rounded-lg hover:bg-sage-50 text-sm font-medium"
                >
                  Start over
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleChatSubmit} className="flex gap-3 shrink-0 pt-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="What would you like to change?"
              className="flex-1 min-w-0 px-5 py-3 border border-sage-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-terracotta-500 text-sage-900 placeholder:text-sage-400 bg-sage-50/50 focus:bg-white transition-all shadow-sm"
              disabled={chatLoading}
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="btn-primary px-6 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl shadow-sm"
            >
              Send
            </button>
          </form>
        </div>
    </>
  );

  return (
    <>
      {/* Mobile: overlay */}
      <div className={`fixed inset-0 flex flex-col justify-end md:hidden ${isCookMode ? 'z-[70]' : 'z-50'}`}>
        <div
          className="bg-sage-900/30 flex-1 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden
        />
        <div
          className="bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col max-h-[85vh] overflow-hidden"
          style={{ transform: `translateY(${dragY}px)` }}
        >
          {sheetContent}
        </div>
      </div>
      
      {/* Desktop */}
      {isCookMode ? (
        <div className="hidden md:flex fixed inset-0 z-[70] justify-end">
          <div className="absolute inset-0 bg-sage-900/20 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
          <div className="relative w-[420px] h-screen bg-white shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
            {sheetContent}
          </div>
        </div>
      ) : (
        <div className="hidden md:flex md:w-[420px] md:min-w-[420px] md:shrink-0 md:flex-col md:h-screen md:sticky md:top-0 md:self-start md:border-l md:border-sage-200/60 md:bg-white md:shadow-[-8px_0_30px_rgba(0,0,0,0.02)] md:overflow-hidden animate-in slide-in-from-right-8 duration-500">
          {sheetContent}
        </div>
      )}
    </>
  );
}
