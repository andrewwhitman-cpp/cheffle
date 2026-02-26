/**
 * Utilities for displaying recipe content: HTML entity decoding and instruction formatting.
 */

/**
 * Decode common HTML entities to their character equivalents.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#034;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

/**
 * Parse instructions text into a clean array of steps.
 * Handles: double numbering (1. 1. ...), concatenated steps, mixed formats.
 */
export function parseInstructionsToSteps(instructions: string): string[] {
  if (!instructions || typeof instructions !== 'string') return [];

  const trimmed = instructions.trim();
  if (!trimmed) return [];

  // Split on pattern "N. " where N is a number - this finds step boundaries
  const parts = trimmed.split(/(\d+\.\s*)/g);

  const steps: string[] = [];
  let currentStep = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^\d+\.\s*$/.test(part)) {
      // This is a step number marker - save previous step if any
      if (currentStep.trim()) {
        steps.push(currentStep.replace(/^\d+\.\s*/g, '').trim());
      }
      currentStep = '';
    } else {
      currentStep += part;
    }
  }
  if (currentStep.trim()) {
    steps.push(currentStep.replace(/^\d+\.\s*/g, '').trim());
  }

  // If we got steps, return them (cleaned of any leading "N. " in each)
  if (steps.length > 0) {
    return steps.map((s) => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  }

  // Fallback: split by newlines
  const byNewline = trimmed.split(/\n+/).map((s) => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  return byNewline.length > 0 ? byNewline : [trimmed];
}
