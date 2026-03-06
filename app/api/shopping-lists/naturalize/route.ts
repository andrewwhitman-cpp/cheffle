import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import OpenAI from 'openai';

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

const NATURALIZE_PROMPT = `You convert shopping list items to natural, human-friendly units. Preserve the exact amount; only change how it's expressed.

Rules:
- 16 oz = 1 lb, 32 oz = 2 lb, etc. Use lb when cleaner.
- 1000 g = 1 kg, 2000 g = 2 kg, etc.
- 8 fl oz = 1 cup, 32 fl oz = 1 qt when applicable.
- 1000 ml = 1 L when applicable.
- Round to common package sizes when very close (e.g. 2.8 oz → 3 oz).
- Keep ingredient names unchanged.
- Return the same number of items in the same order.

Input and output: JSON array of { "name": string, "quantity": number, "unit": string }.
Return ONLY the JSON array, no other text.`;

export async function POST(request: NextRequest) {
  let body: { items?: Array<{ name: string; quantity: number; unit: string }>; unitPreference?: string } = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    return NextResponse.json({ items: [] });
  }

  const { items = [], unitPreference = 'metric' } = body;

  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json({ items });
    }

    const inputStr = JSON.stringify(items);
    const unitHint = String(unitPreference).toLowerCase() === 'imperial'
      ? 'User prefers imperial (oz, lb, fl oz, cups, qt).'
      : 'User prefers metric (g, kg, ml, L).';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `${NATURALIZE_PROMPT}\n\n${unitHint}` },
        { role: 'user', content: inputStr },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ items });
    }

    let jsonStr = content;
    const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) {
      jsonStr = codeBlock[1].trim();
    }

    const parsed = JSON.parse(jsonStr) as Array<{ name?: string; quantity?: number; unit?: string }>;
    if (!Array.isArray(parsed) || parsed.length !== items.length) {
      return NextResponse.json({ items });
    }

    const result = parsed.map((p, i) => ({
      name: String(p.name ?? items[i].name ?? '').trim() || items[i].name,
      quantity: typeof p.quantity === 'number' && !Number.isNaN(p.quantity) ? p.quantity : items[i].quantity,
      unit: String(p.unit ?? items[i].unit ?? '').trim() || items[i].unit,
    }));

    return NextResponse.json({ items: result });
  } catch {
    return NextResponse.json({ items: Array.isArray(items) ? items : [] });
  }
}
