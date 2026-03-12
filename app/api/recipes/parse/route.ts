import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { extractRecipeFromJsonLd, cleanHtmlForAi } from '@/lib/recipe-parser';
import { extractRecipeWithAi } from '@/lib/openai';
import { normalizeInstructions } from '@/lib/recipe-display';
import { parseServingsToNumber } from '@/lib/servings-utils';
import { adjustRecipeForSkillLevel } from '@/lib/recipe-adjustment';
import type { SkillLevel } from '@/lib/skill-levels';
import { extractRecipeMetadata } from '@/lib/parse-metadata';

const ANON_RATE_LIMIT = 3;
const ANON_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const anonParseLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = anonParseLog.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < ANON_RATE_WINDOW_MS);
  anonParseLog.set(ip, recent);
  if (recent.length >= ANON_RATE_LIMIT) return true;
  recent.push(now);
  anonParseLog.set(ip, recent);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);

    if (!user) {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';
      if (isRateLimited(ip)) {
        return NextResponse.json(
          { message: 'Rate limit exceeded. Sign up for unlimited recipe parsing.' },
          { status: 429 },
        );
      }
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { message: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json(
        { message: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Fetch HTML
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const fetchResponse = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Cheffle/1.0; +https://github.com/cheffle)',
      },
    });

    clearTimeout(timeout);

    if (!fetchResponse.ok) {
      return NextResponse.json(
        { message: `Failed to fetch URL: ${fetchResponse.status}` },
        { status: 400 }
      );
    }

    const html = await fetchResponse.text();

    // Skill-level adjustment only for authenticated users
    let skillLevel: SkillLevel | null | undefined = null;
    let kitchenContext = null;
    let dietaryPreferences: string[] | null = null;
    let unitPreference: string | null = null;
    if (user) {
      const profile = (await db.get(
        'SELECT skill_level, kitchen_context, dietary_preferences, unit_preference FROM users WHERE id = ?',
        user.id
      )) as {
        skill_level: string | null;
        kitchen_context: string | null;
        dietary_preferences: string | null;
        unit_preference: string | null;
      } | undefined;
      skillLevel = profile?.skill_level as SkillLevel | null | undefined;
      if (profile?.kitchen_context) {
        try { kitchenContext = JSON.parse(profile.kitchen_context); } catch { kitchenContext = null; }
      }
      if (profile?.dietary_preferences) {
        try { dietaryPreferences = JSON.parse(profile.dietary_preferences); } catch { dietaryPreferences = null; }
      }
      unitPreference = profile?.unit_preference ?? null;
    }
    const validLevels: SkillLevel[] = ['new_to_cooking', 'comfortable_with_cooking', 'experienced_cook'];
    const shouldAdjust = user && skillLevel && validLevels.includes(skillLevel);

    let recipe: {
      name: string;
      description: string;
      ingredients: Array<{ name: string; quantity: string; unit: string }>;
      instructions: string;
      prep_time: number;
      cook_time: number;
      servings?: number | null;
      source_url?: string;
      skill_level_adjusted?: string | null;
      dietary_tags?: string[];
      equipment_required?: string[];
    };

    // Try JSON-LD first
    const jsonLdRecipe = extractRecipeFromJsonLd(html);
    if (jsonLdRecipe && jsonLdRecipe.name && jsonLdRecipe.instructions) {
      recipe = {
        ...jsonLdRecipe,
        instructions: normalizeInstructions(jsonLdRecipe.instructions) || jsonLdRecipe.instructions,
        source_url: url,
        servings: parseServingsToNumber(jsonLdRecipe.servings) ?? undefined,
      };
    } else {
      // Fallback to AI
      const cleanedHtml = cleanHtmlForAi(html);
      const aiRecipe = await extractRecipeWithAi(cleanedHtml);
      recipe = {
        ...aiRecipe,
        instructions: normalizeInstructions(aiRecipe.instructions) || aiRecipe.instructions,
        source_url: url,
        servings: parseServingsToNumber(aiRecipe.servings) ?? undefined,
      };
    }

    // Apply skill-level adjustment if authenticated user has one set
    if (shouldAdjust && skillLevel) {
      const adjusted = await adjustRecipeForSkillLevel(recipe, skillLevel, kitchenContext, dietaryPreferences, unitPreference);
      recipe = { ...adjusted, source_url: url, skill_level_adjusted: skillLevel, servings: recipe.servings };
    }

    // Extract dietary tags and equipment metadata
    const metadata = await extractRecipeMetadata(recipe.name, recipe.ingredients);
    recipe.dietary_tags = metadata.dietary_tags;
    recipe.equipment_required = metadata.equipment_required;

    return NextResponse.json(recipe);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { message: 'Request timed out' },
        { status: 408 }
      );
    }
    console.error('Parse recipe error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to parse recipe' },
      { status: 500 }
    );
  }
}
