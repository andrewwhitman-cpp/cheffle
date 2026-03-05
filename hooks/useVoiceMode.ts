'use client';

/// <reference path="../types/speech.d.ts" />
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  parseKeywordFromTranscript,
  speakText,
  stopSpeaking,
} from '@/lib/voice-utils';

export interface UseVoiceModeOptions {
  /** Called when a voice query is detected (after "Chef" keyword). Receives speak fn and whether TTS is enabled. */
  onQueryDetected: (query: string, speak: (text: string) => void, speakEnabled: boolean) => void | Promise<void>;
  /** Whether to speak AI responses aloud. Default false. */
  speakResponses?: boolean;
  /** When true, use continuous listen for "Chef". When false, use push-to-talk only. */
  continuousMode?: boolean;
}

export interface UseVoiceModeReturn {
  /** Whether voice mode is enabled (user has toggled it on) */
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  /** Whether the browser supports SpeechRecognition */
  isVoiceSupported: boolean;
  /** Whether we are currently listening (continuous or push-to-talk) */
  isListening: boolean;
  /** Start listening (push-to-talk). In continuous mode, this is called automatically when voiceEnabled. */
  startListening: () => void;
  /** Stop listening (push-to-talk). In continuous mode, stops until next restart. */
  stopListening: () => void;
  /** Whether to speak AI responses. User preference. */
  speakResponses: boolean;
  setSpeakResponses: (v: boolean) => void;
  /** Speak text aloud (e.g. after receiving AI response) */
  speak: (text: string) => void;
}

const SpeechRecognitionConstructor =
  typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

export function useVoiceMode(options: UseVoiceModeOptions): UseVoiceModeReturn {
  const { onQueryDetected, speakResponses: initialSpeakResponses = false, continuousMode = true } = options;

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [speakResponses, setSpeakResponses] = useState(initialSpeakResponses);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isPushToTalkRef = useRef(false);
  const restartScheduledRef = useRef(false);
  const continuousModeRef = useRef(continuousMode);
  const voiceEnabledRef = useRef(voiceEnabled);
  const speakResponsesRef = useRef(speakResponses);
  const onQueryDetectedRef = useRef(onQueryDetected);
  continuousModeRef.current = continuousMode;
  voiceEnabledRef.current = voiceEnabled;
  speakResponsesRef.current = speakResponses;
  onQueryDetectedRef.current = onQueryDetected;

  const supported = !!SpeechRecognitionConstructor;

  const stopRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startRecognition = useCallback(
    (pushToTalk = false, isRestart = false) => {
      if (!SpeechRecognitionConstructor || !supported) return;

      stopRecognition();
      // Don't cancel TTS when auto-restarting after a query - user may be listening to the response
      if (!isRestart) stopSpeaking();

      const rec = new SpeechRecognitionConstructor();
      rec.continuous = continuousModeRef.current && !pushToTalk;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        for (let i = event.resultIndex; i < results.length; i++) {
          const result = results[i];
          const transcript = result[0]?.transcript?.trim() || '';
          if (!transcript) continue;

          const speakFn = (text: string) => speakText(text, { truncate: true });
          if (pushToTalk) {
            // Push-to-talk: use full transcript as query
            if (result.isFinal && transcript.length > 2) {
              void onQueryDetectedRef.current(transcript, speakFn, speakResponsesRef.current);
              stopRecognition();
              return;
            }
          } else {
            // Continuous: look for "Chef" keyword
            const query = parseKeywordFromTranscript(transcript);
            if (query && result.isFinal) {
              restartScheduledRef.current = true;
              void onQueryDetectedRef.current(query, speakFn, speakResponsesRef.current);
              stopRecognition();
              setTimeout(() => {
                restartScheduledRef.current = false;
                if (voiceEnabledRef.current && continuousModeRef.current) {
                  startRecognition(false, true);
                }
              }, 800);
              return;
            }
          }
        }
      };

      rec.onend = () => {
        recognitionRef.current = null;
        setIsListening(false);
        if (
          !restartScheduledRef.current &&
          voiceEnabledRef.current &&
          continuousModeRef.current &&
          !isPushToTalkRef.current
        ) {
          setTimeout(() => startRecognition(false, true), 400);
        }
      };

      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        recognitionRef.current = null;
        setIsListening(false);
      };

      try {
        rec.start();
        recognitionRef.current = rec;
        setIsListening(true);
        isPushToTalkRef.current = pushToTalk;
      } catch {
        setIsListening(false);
      }
    },
    [supported, stopRecognition]
  );

  const startListening = useCallback(() => {
    startRecognition(true);
  }, [startRecognition]);

  const stopListening = useCallback(() => {
    stopRecognition();
  }, [stopRecognition]);

  useEffect(() => {
    if (!voiceEnabled) {
      stopRecognition();
      return;
    }
    if (continuousModeRef.current) {
      startRecognition(false);
    }
    return () => stopRecognition();
  }, [voiceEnabled, startRecognition, stopRecognition]);

  const speak = useCallback((text: string) => {
    speakText(text, { truncate: true });
  }, []);

  return {
    voiceEnabled,
    setVoiceEnabled,
    isVoiceSupported: supported,
    isListening,
    startListening,
    stopListening,
    speakResponses,
    setSpeakResponses,
    speak,
  };
}
