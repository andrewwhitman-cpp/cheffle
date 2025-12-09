# Meal Planning Web Application

## Project Structure

```
cheffle/
├── app/               # Next.js App Router
│   ├── api/           # API route handlers
│   │   ├── auth/      # Authentication endpoints
│   │   ├── recipes/   # Recipe CRUD endpoints
│   │   ├── tags/      # Tag management endpoints
│   │   ├── meal-plans/ # Meal plan endpoints
│   │   └── ingredient-lists/ # Ingredient list endpoints
│   ├── login/         # Login page
│   ├── register/      # Registration page
│   ├── dashboard/     # Dashboard page
│   ├── recipes/       # Recipes pages
│   ├── meal-plan/     # Meal plan calendar page
│   ├── ingredient-list/ # Ingredient list page
│   ├── tags/          # Tags management page
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Home page
├── components/        # React components
│   ├── Calendar.tsx   # Calendar component
│   └── ...            # Other reusable components
├── lib/               # Utilities and helpers
│   ├── db.ts          # SQLite connection and schema
│   ├── auth.ts        # Authentication utilities
│   └── ...            # Other utilities
├── contexts/          # React contexts
│   └── AuthContext.tsx # Authentication context
├── database/          # SQLite database file
├── package.json
└── README.md
```

## Technology Stack

- **Frontend**: Next.js (React) with TypeScript
- **Backend**: Next.js API Routes + SQLite (using better-sqlite3)
- **Authentication**: JWT tokens
- **Styling**: Tailwind CSS (or similar modern CSS framework)

## Core Features

### 1. Recipe Management

- Create, read, update, delete recipes
- Recipe fields: name, description, ingredients (with quantities), instructions, prep time, cook time
- Store recipes in SQLite database

### 2. Recipe Tagging System

- Add multiple tags/labels to recipes
- **Required tag categories:**
  - Protein types (e.g., "chicken", "beef", "fish", "vegetarian", "vegan", "pork")
  - Difficulty levels (e.g., "easy", "medium", "hard")
  - Cooking methods (e.g., "slow cooker", "grill", "stovetop", "oven", "instant pot")
  - Cuisine types (e.g., "italian", "american", "mediterranean", "mexican", "asian", "french")
- Additional custom tags can be added
- Filter recipes by tags
- Tag management interface with category organization

### 3. Meal Plan Calendar

- Calendar view (weekly/monthly)
- Drag-and-drop or click-to-assign recipes to specific dates
- View assigned recipes per day
- Edit/remove assignments

### 4. Ingredient List Generation

- Aggregate ingredients from all recipes in meal plan
- Combine duplicate ingredients with quantities
- Display organized shopping list

### 5. Ingredient List Editing

- Manual editing of generated ingredient list
- Add custom items
- Remove items
- Adjust quantities

### 6. User Authentication

- User registration and login
- JWT-based session management
- Protected routes and API endpoints
- Each user has their own recipes and meal plans

## Database Schema

**Users Table**

- id (INTEGER PRIMARY KEY)
- username (TEXT UNIQUE)
- email (TEXT UNIQUE)
- password_hash (TEXT)
- created_at (DATETIME)

**Recipes Table**

- id (INTEGER PRIMARY KEY)
- user_id (INTEGER, FOREIGN KEY)
- name (TEXT)
- description (TEXT)
- ingredients (JSON) - Array of {name, quantity, unit}
- instructions (TEXT)
- prep_time (INTEGER)
- cook_time (INTEGER)
- created_at (DATETIME)
- updated_at (DATETIME)

**Tags Table**

- id (INTEGER PRIMARY KEY)
- name (TEXT UNIQUE)
- color (TEXT) - Optional for UI

**Recipe_Tags Table** (Many-to-Many)

- recipe_id (INTEGER, FOREIGN KEY)
- tag_id (INTEGER, FOREIGN KEY)

**Meal_Plans Table**

- id (INTEGER PRIMARY KEY)
- user_id (INTEGER, FOREIGN KEY)
- date (DATE)
- recipe_id (INTEGER, FOREIGN KEY)
- meal_type (TEXT) - e.g., "breakfast", "lunch", "dinner"

## API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Recipes

- `GET /api/recipes` - Get user's recipes (with optional tag filter)
- `POST /api/recipes` - Create recipe
- `GET /api/recipes/:id` - Get single recipe
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe

### Tags

- `GET /api/tags` - Get all tags
- `POST /api/tags` - Create tag
- `POST /api/recipes/:id/tags` - Add tag to recipe
- `DELETE /api/recipes/:id/tags/:tagId` - Remove tag from recipe

### Meal Plans

- `GET /api/meal-plans` - Get meal plans (with date range filter)
- `POST /api/meal-plans` - Assign recipe to date
- `PUT /api/meal-plans/:id` - Update meal plan assignment
- `DELETE /api/meal-plans/:id` - Remove meal plan assignment

### Ingredient Lists

- `GET /api/ingredient-lists` - Generate ingredient list from meal plan dates
- `POST /api/ingredient-lists` - Save edited ingredient list
- `GET /api/ingredient-lists/:id` - Get saved ingredient list

## Frontend Pages/Components

1. **Login/Register Page** - Authentication forms
2. **Dashboard** - Overview of recent recipes and meal plans
3. **Recipes Page** - List all recipes with filtering by tags
4. **Recipe Detail/Edit Page** - View/edit individual recipe
5. **Meal Plan Calendar** - Calendar view with recipe assignments
6. **Ingredient List Page** - Generated and editable shopping list
7. **Tags Management** - Create and manage tags

## Implementation Approach

1. Set up Next.js project structure with App Router
2. Initialize Next.js with TypeScript, SQLite, and authentication utilities
3. Create database schema and models
4. Implement API route handlers with proper error handling
5. Set up Next.js pages and components with routing
6. Create authentication flow (login/register) using React patterns
7. Build recipe management UI with React components
8. Implement tagging system
9. Create calendar component for meal planning
10. Build ingredient list generation and editing
11. Add styling and polish UI
12. Test end-to-end functionality

## Key Files to Create

- `app/layout.tsx` - Root layout with navigation
- `app/login/page.tsx` - Login page
- `app/register/page.tsx` - Registration page
- `app/dashboard/page.tsx` - Dashboard page
- `app/recipes/page.tsx` - Recipes list
- `app/recipes/[id]/page.tsx` - Recipe detail/edit page
- `app/meal-plan/page.tsx` - Calendar view
- `app/ingredient-list/page.tsx` - Ingredient list page
- `app/tags/page.tsx` - Tags management page
- `app/api/auth/route.ts` - Authentication API routes
- `app/api/recipes/route.ts` - Recipe CRUD API routes
- `app/api/recipes/[id]/route.ts` - Single recipe API routes
- `app/api/tags/route.ts` - Tag management API routes
- `app/api/meal-plans/route.ts` - Meal plan API routes
- `app/api/ingredient-lists/route.ts` - Ingredient list API routes
- `lib/db.ts` - SQLite connection and schema
- `lib/auth.ts` - Authentication utilities
- `contexts/AuthContext.tsx` - Authentication context
- `components/Calendar.tsx` - Calendar component

