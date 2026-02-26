import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { extractRecipeFromJsonLd, cleanHtmlForAi } from '@/lib/recipe-parser';
import { extractRecipeWithAi } from '@/lib/openai';
import { normalizeInstructions } from '@/lib/recipe-display';

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

    // Try JSON-LD first
    const jsonLdRecipe = extractRecipeFromJsonLd(html);
    if (jsonLdRecipe && jsonLdRecipe.name && jsonLdRecipe.instructions) {
      return NextResponse.json({
        ...jsonLdRecipe,
        instructions: normalizeInstructions(jsonLdRecipe.instructions) || jsonLdRecipe.instructions,
        source_url: url,
      });
    }

    // Fallback to AI
    const cleanedHtml = cleanHtmlForAi(html);
    const aiRecipe = await extractRecipeWithAi(cleanedHtml);

    return NextResponse.json({
      ...aiRecipe,
      instructions: normalizeInstructions(aiRecipe.instructions) || aiRecipe.instructions,
      source_url: url,
    });
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
