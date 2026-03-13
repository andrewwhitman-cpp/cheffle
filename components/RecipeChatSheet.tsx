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

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-4 relative">
          {/* Voice indicator (only shown when active) */}
          {isVoiceSupported && voiceEnabled && (
            <div className="absolute bottom-[88px] left-0 right-0 flex justify-center pointer-events-none z-10 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-sage-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-3 border border-sage-700/50">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1 bg-terracotta-400 rounded-full h-2 animate-[bounce_1s_infinite]" />
                  <span className="w-1 bg-terracotta-400 rounded-full h-4 animate-[bounce_1s_infinite_0.2s]" />
                  <span className="w-1 bg-terracotta-400 rounded-full h-3 animate-[bounce_1s_infinite_0.4s]" />
                </div>
                <span className="text-xs font-medium tracking-wide">
                  {isListening ? 'Listening...' : 'Say "Chef"...'}
                </span>
                <div className="w-px h-3 bg-sage-700 mx-1" />
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-sage-300 cursor-pointer pointer-events-auto hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={speakResponses}
                    onChange={(e) => setSpeakResponses(e.target.checked)}
                    className="rounded border-sage-600 bg-sage-800 text-terracotta-500 focus:ring-terracotta-500 focus:ring-offset-sage-900 w-3.5 h-3.5"
                  />
                  Speak
                </label>
              </div>
            </div>
          )}

          <div className="space-y-4 mb-4 flex-1 min-h-0 overflow-y-auto px-1 py-2 scroll-smooth relative">
            {chatMessages.length === 0 && !chatLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-in fade-in duration-700">
                <div className="w-12 h-12 bg-sage-50 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={20} height={20} className="text-sage-400" aria-hidden>
                    <ellipse cx="16" cy="11" rx="9" ry="3.5" fill="currentColor" />
                    <rect x="9" y="11" width="14" height="12" fill="currentColor" />
                  </svg>
                </div>
                <p className="text-[15px] text-sage-600 font-light leading-relaxed">
                  I&apos;m here to help! Ask me to tweak this recipe—add rice, make it vegetarian, double it, or anything else.
                </p>
              </div>
            )}
            
            <div className="flex flex-col space-y-5 pb-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-sage-100 text-sage-900 rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-sm'
                        : 'text-sage-800 px-2 py-1'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 rounded-full bg-terracotta-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={10} height={10} aria-hidden>
                            <ellipse cx="16" cy="11" rx="9" ry="3.5" fill="currentColor" />
                            <rect x="9" y="11" width="14" height="12" fill="currentColor" />
                          </svg>
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-sage-500 font-sans">Cheffle</span>
                      </div>
                    )}
                    <div className="text-[15px] leading-relaxed whitespace-pre-wrap font-light">{msg.content}</div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex w-full justify-start animate-in fade-in">
                  <div className="max-w-[85%] px-2 py-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-terracotta-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={10} height={10} aria-hidden>
                          <ellipse cx="16" cy="11" rx="9" ry="3.5" fill="currentColor" />
                          <rect x="9" y="11" width="14" height="12" fill="currentColor" />
                        </svg>
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-sage-500 font-sans">Cheffle</span>
                    </div>
                    <div className="flex gap-1 items-center h-6 pl-1">
                      <span className="w-1.5 h-1.5 bg-sage-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-sage-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-sage-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {pendingRecipe && (
            <div className="mb-4 p-5 bg-white border border-terracotta-200 shadow-[0_8px_30px_-6px_rgba(200,75,49,0.12)] rounded-2xl shrink-0 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-terracotta-500" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-terracotta-600 font-sans mb-1 ml-1">Recipe Updated</p>
              <p className="text-base font-serif text-sage-900 mb-4 ml-1">I&apos;ve prepared your new version.</p>
              <div className="flex gap-3 ml-1">
                <button onClick={handleApplyChanges} disabled={chatLoading} className="btn-primary px-5 py-2.5 text-sm shadow-sm flex-1">
                  Apply changes
                </button>
                <button
                  onClick={clearPendingRecipe}
                  className="btn-ghost px-4 py-2.5 text-sm"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleChatSubmit} className="flex gap-2 shrink-0 pt-2 pb-2">
            <div className="relative flex-1 flex items-center bg-sage-50/50 border border-sage-200/60 rounded-[2rem] focus-within:bg-white focus-within:border-terracotta-300 focus-within:ring-2 focus-within:ring-terracotta-500/20 transition-all shadow-sm pl-2 pr-1.5 py-1.5">
              
              {isVoiceSupported && (
                <button
                  type="button"
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  title={voiceEnabled ? 'Disable voice mode' : 'Enable voice mode'}
                  className={`p-2 rounded-full transition-colors shrink-0 ${
                    voiceEnabled ? 'text-terracotta-600 bg-terracotta-50' : 'text-sage-400 hover:text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                    <path d="M4 10a8 8 0 0 0 16 0v2a8 8 0 0 1-16 0V10z" />
                  </svg>
                </button>
              )}

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message Cheffle..."
                className="flex-1 min-w-0 px-3 py-2 bg-transparent focus:outline-none text-sage-900 placeholder:text-sage-400 text-[15px]"
                disabled={chatLoading}
              />
              
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="w-9 h-9 rounded-full bg-terracotta-600 text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-terracotta-700 transition-colors shadow-sm ml-1"
                aria-label="Send message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
              </button>
            </div>
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
