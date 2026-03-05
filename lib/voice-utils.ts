/**
 * Voice utilities for keyword detection and text-to-speech.
 * Used by the cooking view voice mode.
 */

export const VOICE_KEYWORD = 'chef';

/**
 * Parse transcript for the keyword "Chef" and return the query portion.
 * Handles: "Chef, how much flour?" -> "how much flour?"
 * Also: "Hey Chef what's the next step" -> "what's the next step"
 */
export function parseKeywordFromTranscript(transcript: string): string | null {
  const trimmed = String(transcript || '').trim().toLowerCase();
  if (!trimmed) return null;

  const keyword = VOICE_KEYWORD.toLowerCase();
  const idx = trimmed.indexOf(keyword);
  if (idx === -1) return null;

  // Get text after the keyword (plus any trailing comma/space)
  const after = trimmed.slice(idx + keyword.length).replace(/^[\s,]+/, '').trim();
  return after || null;
}

/**
 * Check if transcript contains the keyword (for continuous mode).
 * Returns true if "chef" appears anywhere.
 */
export function transcriptContainsKeyword(transcript: string): boolean {
  return String(transcript || '').toLowerCase().includes(VOICE_KEYWORD.toLowerCase());
}

/**
 * Speak text using the Web Speech API.
 * Truncates long responses to first 2-3 sentences for TTS.
 */
export function speakText(text: string, options?: { truncate?: boolean }): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const trimmed = String(text || '').trim();
  if (!trimmed) return;

  let toSpeak = trimmed;
  if (options?.truncate !== false && trimmed.length > 200) {
    // Take first 2-3 sentences
    const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
    toSpeak = sentences.slice(0, 3).join(' ').trim() || trimmed.slice(0, 200);
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(toSpeak);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

/**
 * Stop any ongoing speech.
 */
export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

/**
 * Check if the browser supports SpeechRecognition.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
}
