export interface DemoRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  instructions: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  source_url?: string;
  skill_level_adjusted?: string | null;
  created_at?: string;
  dietary_tags?: string[];
  equipment_required?: string[];
}

export const demoRecipes: DemoRecipe[] = [
  {
    id: 'demo-1',
    name: 'Classic Spaghetti Aglio e Olio',
    description:
      'A simple Roman pasta with garlic, olive oil, and chili flakes. Ready in under 20 minutes.',
    ingredients: [
      { name: 'spaghetti', quantity: '400', unit: 'g' },
      { name: 'garlic cloves, thinly sliced', quantity: '6', unit: '' },
      { name: 'extra-virgin olive oil', quantity: '1/3', unit: 'cup' },
      { name: 'red chili flakes', quantity: '1/2', unit: 'tsp' },
      { name: 'fresh parsley, chopped', quantity: '1/4', unit: 'cup' },
      { name: 'salt', quantity: '', unit: 'to taste' },
      { name: 'Parmesan cheese, grated', quantity: '', unit: 'for serving' },
    ],
    instructions:
      '1. Bring a large pot of salted water to a boil and cook spaghetti according to package directions until al dente. Reserve 1 cup of pasta water before draining.\n\n2. While the pasta cooks, heat olive oil in a large skillet over medium-low heat. Add the sliced garlic and chili flakes. Cook gently for 2–3 minutes, stirring often, until the garlic is golden but not burnt.\n\n3. Add the drained pasta to the skillet. Toss to coat in the oil, adding a few splashes of reserved pasta water to create a light, silky sauce.\n\n4. Remove from heat, toss in the parsley, and season with salt. Serve with grated Parmesan.',
    prep_time: 5,
    cook_time: 15,
    servings: 4,
    created_at: '2025-12-01T12:00:00Z',
  },
  {
    id: 'demo-2',
    name: 'Thai Basil Chicken (Pad Krapow Gai)',
    description:
      'A quick, punchy Thai stir-fry with ground chicken, holy basil, and a savory-sweet sauce. Serve over jasmine rice with a fried egg.',
    ingredients: [
      { name: 'ground chicken', quantity: '1', unit: 'lb' },
      { name: 'Thai basil leaves', quantity: '1', unit: 'cup' },
      { name: 'garlic cloves, minced', quantity: '4', unit: '' },
      { name: 'Thai chilies, sliced', quantity: '3', unit: '' },
      { name: 'soy sauce', quantity: '2', unit: 'tbsp' },
      { name: 'oyster sauce', quantity: '1', unit: 'tbsp' },
      { name: 'fish sauce', quantity: '1', unit: 'tbsp' },
      { name: 'sugar', quantity: '1', unit: 'tsp' },
      { name: 'vegetable oil', quantity: '2', unit: 'tbsp' },
      { name: 'jasmine rice, cooked', quantity: '', unit: 'for serving' },
    ],
    instructions:
      '1. Heat oil in a wok or large skillet over high heat until smoking.\n\n2. Add garlic and chilies. Stir-fry for 30 seconds until fragrant.\n\n3. Add ground chicken. Break it up and cook for 3–4 minutes until no longer pink.\n\n4. Add soy sauce, oyster sauce, fish sauce, and sugar. Stir-fry for another 2 minutes.\n\n5. Remove from heat and fold in Thai basil leaves until just wilted.\n\n6. Serve over jasmine rice. Top with a fried egg if desired.',
    prep_time: 10,
    cook_time: 10,
    servings: 2,
    created_at: '2025-11-28T12:00:00Z',
  },
  {
    id: 'demo-3',
    name: 'Roasted Cauliflower Soup',
    description:
      'A creamy, velvety soup made from roasted cauliflower, onion, and garlic. No cream needed — the roasting brings out all the flavor.',
    ingredients: [
      { name: 'cauliflower, cut into florets', quantity: '1', unit: 'large head' },
      { name: 'yellow onion, quartered', quantity: '1', unit: '' },
      { name: 'garlic cloves, unpeeled', quantity: '6', unit: '' },
      { name: 'olive oil', quantity: '3', unit: 'tbsp' },
      { name: 'vegetable broth', quantity: '4', unit: 'cups' },
      { name: 'salt', quantity: '1', unit: 'tsp' },
      { name: 'black pepper', quantity: '1/2', unit: 'tsp' },
      { name: 'nutmeg', quantity: '1/4', unit: 'tsp' },
      { name: 'crusty bread', quantity: '', unit: 'for serving' },
    ],
    instructions:
      '1. Preheat oven to 425°F (220°C). Spread cauliflower florets, onion quarters, and garlic cloves on a baking sheet. Drizzle with olive oil and season with salt and pepper. Toss to coat.\n\n2. Roast for 25–30 minutes, turning once, until the cauliflower is golden brown and tender.\n\n3. Squeeze the roasted garlic out of its skins into a blender or large pot. Add the roasted cauliflower and onion.\n\n4. Add the vegetable broth and nutmeg. Blend until completely smooth (use an immersion blender or work in batches).\n\n5. Heat through on the stove if needed. Taste and adjust seasoning. Serve with crusty bread.',
    prep_time: 10,
    cook_time: 30,
    servings: 4,
    created_at: '2025-11-25T12:00:00Z',
  },
  {
    id: 'demo-4',
    name: 'Honey-Lime Shrimp Tacos',
    description:
      'Bright and zesty tacos with seared shrimp, a honey-lime glaze, pickled red onion, and a cilantro-lime crema.',
    ingredients: [
      { name: 'large shrimp, peeled and deveined', quantity: '1', unit: 'lb' },
      { name: 'honey', quantity: '2', unit: 'tbsp' },
      { name: 'lime juice', quantity: '3', unit: 'tbsp' },
      { name: 'olive oil', quantity: '1', unit: 'tbsp' },
      { name: 'chili powder', quantity: '1', unit: 'tsp' },
      { name: 'cumin', quantity: '1/2', unit: 'tsp' },
      { name: 'small flour tortillas', quantity: '8', unit: '' },
      { name: 'red cabbage, thinly shredded', quantity: '2', unit: 'cups' },
      { name: 'sour cream', quantity: '1/4', unit: 'cup' },
      { name: 'fresh cilantro, chopped', quantity: '2', unit: 'tbsp' },
    ],
    instructions:
      '1. Whisk together honey, 2 tbsp lime juice, chili powder, and cumin in a bowl. Add shrimp and toss to coat. Let sit for 5 minutes.\n\n2. Make the crema: stir together sour cream, remaining 1 tbsp lime juice, and cilantro. Season with a pinch of salt.\n\n3. Heat olive oil in a skillet over medium-high heat. Sear shrimp for 2 minutes per side until pink and slightly charred.\n\n4. Warm tortillas in a dry pan or microwave.\n\n5. Assemble tacos: tortilla, shredded cabbage, shrimp, drizzle of crema. Serve with lime wedges.',
    prep_time: 15,
    cook_time: 5,
    servings: 4,
    created_at: '2025-11-20T12:00:00Z',
  },
  {
    id: 'demo-5',
    name: 'Classic French Omelette',
    description:
      'A silky, barely-set French omelette with fine herbs. Mastering this technique is a rite of passage for any home cook.',
    ingredients: [
      { name: 'large eggs', quantity: '3', unit: '' },
      { name: 'unsalted butter', quantity: '1', unit: 'tbsp' },
      { name: 'fresh chives, finely chopped', quantity: '1', unit: 'tbsp' },
      { name: 'fresh tarragon, finely chopped', quantity: '1', unit: 'tsp' },
      { name: 'salt', quantity: '', unit: 'to taste' },
      { name: 'white pepper', quantity: '', unit: 'to taste' },
    ],
    instructions:
      '1. Crack eggs into a bowl. Season with salt and white pepper. Beat with a fork until just combined — do not over-beat.\n\n2. Heat an 8-inch non-stick skillet over medium-high heat. Add butter and swirl to coat the pan as it foams.\n\n3. When the foam subsides, pour in the eggs. Immediately begin stirring with a chopstick or rubber spatula while shaking the pan.\n\n4. When the eggs are mostly set but the surface is still slightly wet, stop stirring. Let it cook undisturbed for 10 seconds.\n\n5. Sprinkle herbs across the center. Tilt the pan and fold the omelette onto itself, then roll it onto a plate seam-side down.\n\n6. Rub a small piece of butter over the top for shine. Serve immediately.',
    prep_time: 2,
    cook_time: 3,
    servings: 1,
    created_at: '2025-11-15T12:00:00Z',
  },
  {
    id: 'demo-6',
    name: 'Shakshuka',
    description:
      'Eggs poached in a spiced tomato-pepper sauce. A North African and Middle Eastern staple that works for any meal of the day.',
    ingredients: [
      { name: 'olive oil', quantity: '2', unit: 'tbsp' },
      { name: 'yellow onion, diced', quantity: '1', unit: '' },
      { name: 'red bell pepper, diced', quantity: '1', unit: '' },
      { name: 'garlic cloves, minced', quantity: '3', unit: '' },
      { name: 'cumin', quantity: '1', unit: 'tsp' },
      { name: 'paprika', quantity: '1', unit: 'tsp' },
      { name: 'crushed tomatoes', quantity: '1', unit: '28-oz can' },
      { name: 'large eggs', quantity: '6', unit: '' },
      { name: 'feta cheese, crumbled', quantity: '1/4', unit: 'cup' },
      { name: 'fresh cilantro or parsley', quantity: '', unit: 'for garnish' },
      { name: 'crusty bread', quantity: '', unit: 'for serving' },
    ],
    instructions:
      '1. Heat olive oil in a large, deep skillet over medium heat. Add onion and bell pepper. Cook for 5 minutes until softened.\n\n2. Add garlic, cumin, and paprika. Stir for 1 minute until fragrant.\n\n3. Pour in crushed tomatoes. Season with salt and pepper. Simmer for 10 minutes until the sauce thickens slightly.\n\n4. Make 6 wells in the sauce. Crack an egg into each well.\n\n5. Cover and cook on medium-low for 5–7 minutes, until the whites are set but yolks are still runny.\n\n6. Sprinkle with feta and herbs. Serve straight from the skillet with crusty bread for dipping.',
    prep_time: 10,
    cook_time: 20,
    servings: 3,
    created_at: '2025-11-10T12:00:00Z',
  },
];

export function isDemoRecipe(id: string | number): boolean {
  return String(id).startsWith('demo-');
}

export function getDemoRecipe(id: string): DemoRecipe | undefined {
  return demoRecipes.find((r) => r.id === id);
}

export function getDemoRecipesList(): DemoRecipe[] {
  return demoRecipes;
}
