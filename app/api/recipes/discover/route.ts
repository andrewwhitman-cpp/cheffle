import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { DISCOVER_SYSTEM_PROMPT } from '@/lib/discover-prompts';
import { searchRecipes } from '@/lib/serp-api';

function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey: key });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, answers } = body;

    if (!text) {
      return NextResponse.json({ message: 'Text is required' }, { status: 400 });
    }

    const openai = getOpenAIClient();

    let userContent = `User's initial request: "${text}"`;
    if (answers && Object.keys(answers).length > 0) {
      userContent += `\n\nAnswers to previous questions:\n${JSON.stringify(answers, null, 2)}`;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: DISCOVER_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content?.trim() || '';
    
    let parsed;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1].trim());
    } else {
      parsed = JSON.parse(content);
    }

    if (parsed.complete && parsed.searchQuery) {
      if (!process.env.SERPAPI_KEY) {
        return NextResponse.json(
          { message: 'Recipe search is not configured. Add SERPAPI_KEY to your .env.local file. Get a key at serpapi.com.' },
          { status: 503 }
        );
      }
      try {
        const recipes = await searchRecipes(parsed.searchQuery);
        return NextResponse.json({
          complete: true,
          recipes,
        });
      } catch (searchErr: any) {
        console.error('Search error:', searchErr);
        return NextResponse.json({ message: 'Failed to search for recipes', error: searchErr.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({
        complete: false,
        questions: parsed.questions || [],
      });
    }

  } catch (error: any) {
    console.error('Discover error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
