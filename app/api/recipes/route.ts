import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { parseServingsToNumber } from '@/lib/servings-utils';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const maxTotalTime = searchParams.get('max_total_time');
    const skillLevel = searchParams.get('skill_level');
    const dietary = searchParams.get('dietary');
    const favorite = searchParams.get('favorite');
    const collectionId = searchParams.get('collection');
    const tagId = searchParams.get('tag');
    const equipmentMatch = searchParams.get('equipment_match');

    const joins: string[] = [];
    let query = `
      SELECT DISTINCT
        r.id,
        r.name,
        r.description,
        r.ingredients,
        r.instructions,
        r.prep_time,
        r.cook_time,
        r.servings,
        r.source_url,
        r.skill_level_adjusted,
        r.is_favorite,
        r.dietary_tags,
        r.equipment_required,
        r.created_at,
        r.updated_at
      FROM recipes r
    `;
    const conditions: string[] = ['r.user_id = ?'];
    const params: (string | number)[] = [user.id];

    if (collectionId) {
      joins.push('INNER JOIN recipe_collections rc ON rc.recipe_id = r.id');
      conditions.push('rc.collection_id = ?');
      params.push(parseInt(collectionId, 10));
    }
    if (tagId) {
      joins.push('INNER JOIN recipe_tags rt ON rt.recipe_id = r.id');
      conditions.push('rt.tag_id = ?');
      params.push(parseInt(tagId, 10));
    }

    if (search) {
      conditions.push('(r.name LIKE ? OR r.description LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    if (maxTotalTime) {
      conditions.push('(r.prep_time + r.cook_time) <= ?');
      params.push(parseInt(maxTotalTime, 10));
    }
    if (skillLevel) {
      conditions.push('r.skill_level_adjusted = ?');
      params.push(skillLevel);
    }
    if (dietary) {
      conditions.push("r.dietary_tags LIKE ?");
      params.push(`%"${dietary}"%`);
    }
    if (favorite === '1') {
      conditions.push('r.is_favorite = 1');
    }

    query = query + joins.join(' ') + ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY r.created_at DESC';

    if (limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(limit, 10));
    }

    let recipes = (await db.all(query, ...params)) as any[];

    // Equipment match: client-side post-filter since it requires comparing JSON arrays
    if (equipmentMatch === '1') {
      const profile = (await db.get(
        'SELECT kitchen_context FROM users WHERE id = ?', user.id
      )) as { kitchen_context: string | null } | undefined;
      let userEquipment: Set<string> = new Set();
      if (profile?.kitchen_context) {
        try {
          const ctx = JSON.parse(profile.kitchen_context);
          const have = [
            ...(ctx.equipment_have || []),
            ...(ctx.appliances_have || []),
          ];
          userEquipment = new Set(have);
        } catch { /* empty */ }
      }
      recipes = recipes.filter((r: any) => {
        const required: string[] = r.equipment_required ? JSON.parse(r.equipment_required) : [];
        if (required.length === 0) return true;
        return required.every((e: string) => userEquipment.has(e));
      });
    }

    const result = recipes.map((recipe: any) => ({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients || '[]'),
      is_favorite: recipe.is_favorite === 1,
      dietary_tags: recipe.dietary_tags ? JSON.parse(recipe.dietary_tags as string) : [],
      equipment_required: recipe.equipment_required ? JSON.parse(recipe.equipment_required as string) : [],
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Get recipes error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, ingredients, instructions, prep_time, cook_time, source_url, skill_level_adjusted, servings, dietary_tags, equipment_required } = body;

    if (!name || !instructions) {
      return NextResponse.json(
        { message: 'Name and instructions are required' },
        { status: 400 }
      );
    }

    const validSkillLevels = ['new_to_cooking', 'comfortable_with_cooking', 'experienced_cook'];
    const skillLevelAdjusted =
      skill_level_adjusted != null && validSkillLevels.includes(String(skill_level_adjusted))
        ? String(skill_level_adjusted)
        : null;

    const servingsNum = parseServingsToNumber(servings);
    const dietaryStr = Array.isArray(dietary_tags) ? JSON.stringify(dietary_tags) : null;
    const equipmentStr = Array.isArray(equipment_required) ? JSON.stringify(equipment_required) : null;

    const result = await db.run(
      `INSERT INTO recipes (user_id, name, description, ingredients, instructions, prep_time, cook_time, servings, source_url, skill_level_adjusted, dietary_tags, equipment_required)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        user.id,
        name,
        description || '',
        JSON.stringify(ingredients || []),
        instructions,
        prep_time || 0,
        cook_time || 0,
        servingsNum ?? null,
        source_url || null,
        skillLevelAdjusted,
        dietaryStr,
        equipmentStr
    );

    const recipeId = result.lastInsertRowid;
    const recipe = (await db.get('SELECT * FROM recipes WHERE id = ?', recipeId)) as any;

    return NextResponse.json({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients || '[]'),
      dietary_tags: recipe.dietary_tags ? JSON.parse(recipe.dietary_tags) : [],
      equipment_required: recipe.equipment_required ? JSON.parse(recipe.equipment_required) : [],
    });
  } catch (error: any) {
    console.error('Create recipe error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
