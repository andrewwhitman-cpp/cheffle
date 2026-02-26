import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { extractRecipeFromJsonLd, cleanHtmlForAi } from '@/lib/recipe-parser';
import { extractRecipeWithAi } from '@/lib/openai';
import { normalizeInstructions } from '@/lib/recipe-display';
import { adjustRecipeForSkillLevel } from '@/lib/recipe-adjustment';
import type { SkillLevel } from '@/lib/skill-levels';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
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

    // Get user's skill level and kitchen context for recipe adjustment
    const profile = db.prepare('SELECT skill_level, kitchen_context FROM users WHERE id = ?').get(user.id) as {
      skill_level: string | null;
      kitchen_context: string | null;
    } | undefined;
    const skillLevel = profile?.skill_level as SkillLevel | null | undefined;
    let kitchenContext = null;
    if (profile?.kitchen_context) {
      try {
        kitchenContext = JSON.parse(profile.kitchen_context);
      } catch {
        kitchenContext = null;
      }
    }
    const validLevels: SkillLevel[] = ['new_to_cooking', 'comfortable_with_cooking', 'experienced_cook'];
    const shouldAdjust = skillLevel && validLevels.includes(skillLevel);

    let recipe: {
      name: string;
      description: string;
      ingredients: Array<{ name: string; quantity: string; unit: string }>;
      instructions: string;
      prep_time: number;
      cook_time: number;
      source_url?: string;
      skill_level_adjusted?: string | null;
    };

    // Try JSON-LD first
    const jsonLdRecipe = extractRecipeFromJsonLd(html);
    if (jsonLdRecipe && jsonLdRecipe.name && jsonLdRecipe.instructions) {
      recipe = {
        ...jsonLdRecipe,
        instructions: normalizeInstructions(jsonLdRecipe.instructions) || jsonLdRecipe.instructions,
        source_url: url,
      };
    } else {
      // Fallback to AI
      const cleanedHtml = cleanHtmlForAi(html);
      const aiRecipe = await extractRecipeWithAi(cleanedHtml);
      recipe = {
        ...aiRecipe,
        instructions: normalizeInstructions(aiRecipe.instructions) || aiRecipe.instructions,
        source_url: url,
      };
    }

    // Apply skill-level adjustment if user has one set
    if (shouldAdjust && skillLevel) {
      const adjusted = await adjustRecipeForSkillLevel(recipe, skillLevel, kitchenContext);
      recipe = { ...adjusted, source_url: url, skill_level_adjusted: skillLevel };
    }

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
