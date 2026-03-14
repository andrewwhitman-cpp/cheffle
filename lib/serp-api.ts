export interface SerpRecipe {
  title: string;
  link: string;
  source: string;
  rating?: number;
  reviews?: number;
  total_time?: string;
  ingredients_count?: number;
}

export async function searchRecipes(query: string): Promise<SerpRecipe[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error('SERPAPI_KEY is not configured');
  }

  const url = new URL('https://serpapi.com/search');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', query + ' recipe');
  url.searchParams.set('api_key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return (data.recipes_results || []).map((r: any) => ({
    title: r.title,
    link: r.link,
    source: r.source,
    rating: r.rating,
    reviews: r.reviews,
    total_time: r.total_time,
    ingredients_count: r.total_ingredients,
  }));
}
